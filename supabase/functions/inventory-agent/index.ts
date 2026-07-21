// ============================================================
// REMEDIUM IMS - INVENTORY AGENT (Gemini version)
// supabase/functions/inventory-agent/index.ts
//
// Same architecture: TRIGGER -> OBSERVE -> DECIDE -> ACT -> LOG
// Only the "Decide" layer changed: Gemini instead of Claude.
// Gemini free tier = no credits needed. Perfect for learning.
//
// Deploy:  supabase functions deploy inventory-agent
// Secret:  supabase secrets set GEMINI_API_KEY=your-key-here
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const MODEL = "gemini-3.5-flash";; // fast + free tier

// ------------------------------------------------------------
// 1. TOOL DECLARATIONS (what the LLM is allowed to request)
//    Gemini calls these "functionDeclarations" - same idea as
//    Claude's tools, slightly different JSON shape.
// ------------------------------------------------------------
const functionDeclarations = [
  {
    name: "create_restock_task",
    description:
      "Create a restock task for the warehouse team. Only use when no open restock task already exists for this product (check the open_restock_tasks list you were given).",
    parameters: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        sku: { type: "string" },
        current_stock: { type: "number" },
        threshold: { type: "number" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description:
            "urgent if stock is 0 or the product is high-value equipment; high if stock is under half the threshold; medium otherwise",
        },
        reasoning: {
          type: "string",
          description: "One sentence: why this priority",
        },
      },
      required: ["product_name", "sku", "current_stock", "threshold", "priority"],
    },
  },
  {
    name: "send_alert",
    description:
      "Send an alert to the warehouse manager. Use only for serious situations: stock at zero, or expensive equipment running low. Do not alert for routine restocks.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string" },
        severity: { type: "string", enum: ["info", "warning", "critical"] },
      },
      required: ["message", "severity"],
    },
  },
];

// ------------------------------------------------------------
// 2. TOOL EXECUTION (the "Act" layer - identical to before,
//    plain CRUD. The LLM never touches the DB directly.)
// ------------------------------------------------------------
async function executeTool(name: string, input: Record<string, unknown>) {
  if (name === "create_restock_task") {
    const { data: warehouse } = await supabase
      .from("employees")
      .select("id")
      .ilike("role", "%warehouse%")
      .limit(1)
      .maybeSingle();

    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: `Restock: ${input.product_name} (${input.sku})`,
        description: `Auto-created by inventory agent. Stock: ${input.current_stock}, threshold: ${input.threshold}. ${input.reasoning ?? ""}`,
        assigned_to: warehouse?.id ?? null,
        priority: input.priority,
        status: "todo",
        due_date: dueDate,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, task_id: data.id };
  }

  if (name === "send_alert") {
    const { error } = await supabase.from("alerts").insert({
      message: input.message,
      severity: input.severity,
      source: "inventory-agent",
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  return { ok: false, error: `Unknown tool: ${name}` };
}

// ------------------------------------------------------------
// 3. LLM CALL (the "Decide" layer - Gemini API)
// ------------------------------------------------------------
const SYSTEM_PROMPT = `You are the inventory agent for Remedium IMS, an inventory system for a printing-supplies company.

Every run you receive a snapshot: low-stock products and the restock tasks that are already open.

Your job:
- For each low-stock product WITHOUT an existing open restock task, call create_restock_task with a sensible priority.
- Never create a duplicate task for a product that already has one open.
- If any product is completely out of stock (0), or an expensive item (price above 50000) is low, also call send_alert.
- After all tool calls, reply with a 2-3 sentence plain-text summary of what you did and why. This summary is shown to the team in the dashboard.
- If there is nothing to do, call no tools and just say so in one sentence.`;

async function callGemini(contents: unknown[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      tools: [{ functionDeclarations }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  return res.json();
}

// ------------------------------------------------------------
// 4. MAIN HANDLER (Trigger -> Observe -> agent loop -> Log)
// ------------------------------------------------------------
Deno.serve(async (req) => {
  const startedAt = Date.now();
  const actionsTaken: unknown[] = [];
  let triggerType = "scheduled";
  try {
    const body = await req.json().catch(() => ({}));
    if (body.trigger) triggerType = body.trigger; // "manual" from the UI button

    // ---- OBSERVE ----
    const { data: lowStock, error: lsErr } = await supabase
      .from("low_stock_products")
      .select("*");
    if (lsErr) throw new Error(lsErr.message);

    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    const { data: openTasks } = await supabase
      .from("tasks")
      .select("title, status")
      .ilike("title", "Restock:%")
      .neq("status", "done");

    // Nothing low? Log and exit early - don't waste an LLM call.
    if (!lowStock || lowStock.length === 0) {
      await supabase.from("agent_runs").insert({
        trigger_type: triggerType,
        products_checked: totalProducts ?? 0,
        low_stock_found: 0,
        actions_taken: [],
        summary: "All products above threshold. No action needed.",
        status: "success",
      });
      return Response.json({ ok: true, message: "Nothing to do" });
    }

    // ---- DECIDE + ACT (the agent loop) ----
    const contents: unknown[] = [
      {
        role: "user",
        parts: [
          {
            text:
              `Snapshot for this run:\n\n` +
              `low_stock_products:\n${JSON.stringify(lowStock, null, 2)}\n\n` +
              `open_restock_tasks:\n${JSON.stringify(openTasks ?? [], null, 2)}`,
          },
        ],
      },
    ];

    let summary = "";
    for (let turn = 0; turn < 5; turn++) {
      const response = await callGemini(contents);
      const parts = response.candidates?.[0]?.content?.parts ?? [];

      // collect any text the model wrote
      const textParts = parts.filter((p: any) => p.text);
      if (textParts.length) summary = textParts.map((p: any) => p.text).join("\n");

      // did the model request any tools this turn?
      const calls = parts.filter((p: any) => p.functionCall);
      if (calls.length === 0) break; // model is done

      // add the model's turn to history, then execute its requests
      contents.push({ role: "model", parts });
      const responseParts = [];
      for (const call of calls) {
        const { name, args } = call.functionCall;
        const result = await executeTool(name, args ?? {});
        actionsTaken.push({ tool: name, input: args, result });
        responseParts.push({ functionResponse: { name, response: result } });
      }

      // feed results back so the model can continue reasoning
      contents.push({ role: "user", parts: responseParts });
    }

    // ---- LOG ----
    await supabase.from("agent_runs").insert({
      trigger_type: triggerType,
      products_checked: totalProducts ?? 0,
      low_stock_found: lowStock.length,
      actions_taken: actionsTaken,
      summary,
      status: "success",
    });

    return Response.json({
      ok: true,
      low_stock: lowStock.length,
      actions: actionsTaken.length,
      summary,
      ms: Date.now() - startedAt,
    });
  } catch (err) {
    await supabase.from("agent_runs").insert({
      trigger_type: triggerType,
      actions_taken: actionsTaken,
      summary: `Agent failed: ${(err as Error).message}`,
      status: "failed",
    });
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
});
