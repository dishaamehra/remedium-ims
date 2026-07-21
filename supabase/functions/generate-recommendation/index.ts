// ============================================================
// generate-recommendation (Phase 3 - Gemini-powered)
// supabase/functions/generate-recommendation/index.ts
//
// Compare this to the Phase 2 version: sections 1, 2, 5 (fetch
// product, dedupe check, insert draft) are UNCHANGED. Only
// section 3 (gather more context) and section 4 (decide) are
// different. That's the whole promise of building it this way.
//
// Deploy: supabase functions deploy generate-recommendation
// Secret: reuses the existing GEMINI_API_KEY - nothing new to set
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const MODEL = "gemini-3.5-flash"; // same model that's already working for inventory-agent

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

const SYSTEM_PROMPT = `You are a purchasing assistant for Remedium Enterprises, a printing-supplies distributor.
You recommend whether and how much to reorder a product. You do NOT have authority to place
orders - a manager reviews every recommendation before anything is purchased.

Respond with JSON only, matching this exact shape:
{
  "action": "reorder" | "no_action",
  "recommended_quantity": <positive integer, required if action is "reorder">,
  "recommended_supplier_id": <integer, must be one of the supplier_id values given to you, required if action is "reorder">,
  "reasoning": "<2-4 plain-language sentences for a warehouse manager>"
}

Only ever choose a supplier_id that appears in the supplier_options you are given.
Never invent a supplier or a supplier_id that isn't in that list.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { product_id } = await req.json();
    if (!product_id) return json({ ok: false, error: "product_id is required" }, 400);

    // ---- 1. Fetch the product (unchanged from Phase 2) ----
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, name, sku, stock_quantity, low_stock_threshold, price")
      .eq("id", product_id)
      .single();
    if (pErr || !product) return json({ ok: false, error: "Product not found" }, 404);

    if (product.stock_quantity > product.low_stock_threshold) {
      return json({ ok: true, message: "Stock is above threshold, no recommendation needed" });
    }

    // ---- 2. Dedupe (unchanged from Phase 2) ----
    const { data: existingDraft } = await supabase
      .from("purchase_recommendations")
      .select("*")
      .eq("product_id", product_id)
      .eq("status", "draft")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingDraft) return json({ ok: true, recommendation: existingDraft, reused: true });

    // ---- 3. Gather context - supplier options (unchanged) + two new signals ----
    const { data: supplierOptions } = await supabase
      .from("product_suppliers")
      .select("supplier_id, unit_cost, lead_time_days, preferred, suppliers(name)")
      .eq("product_id", product_id)
      .order("unit_cost", { ascending: true });

    if (!supplierOptions || supplierOptions.length === 0) {
      return json({ ok: false, error: "No suppliers configured for this product yet" }, 400);
    }

    // NEW: pending customer demand for this product
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("id")
      .in("status", ["pending", "confirmed"]);
    const activeOrderIds = (activeOrders ?? []).map((o) => o.id);

    let pendingDemand = 0;
    if (activeOrderIds.length) {
      const { data: items } = await supabase
        .from("order_items")
        .select("quantity")
        .eq("product_id", product_id)
        .in("order_id", activeOrderIds);
      pendingDemand = (items ?? []).reduce((sum, i) => sum + i.quantity, 0);
    }

    // NEW: recent purchase history for this product
    const { data: history } = await supabase
      .from("purchase_order_items")
      .select("quantity, unit_cost, purchase_orders(po_number, created_at, suppliers(name))")
      .eq("product_id", product_id)
      .order("id", { ascending: false })
      .limit(3);

    // ---- 4. DECIDE - this is the block that changed (was rule-based, now Gemini) ----
    const supplierOptionsForPrompt = supplierOptions.map((s) => ({
      supplier_id: s.supplier_id,
      name: s.suppliers?.name,
      unit_cost: s.unit_cost,
      lead_time_days: s.lead_time_days,
      preferred: s.preferred,
    }));

    const userContext = {
      product: {
        name: product.name,
        sku: product.sku,
        current_stock: product.stock_quantity,
        reorder_threshold: product.low_stock_threshold,
        sale_price: product.price,
      },
      pending_customer_demand: pendingDemand,
      supplier_options: supplierOptionsForPrompt,
      recent_purchase_history: (history ?? []).map((h) => ({
        quantity: h.quantity,
        unit_cost: h.unit_cost,
        supplier: h.purchase_orders?.suppliers?.name,
        date: h.purchase_orders?.created_at,
      })),
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(userContext, null, 2) }] }],
          generationConfig: { responseMimeType: "application/json" }, // forces valid JSON back
        }),
      },
    );

    if (!geminiRes.ok) {
      return json({ ok: false, error: `Gemini API error: ${geminiRes.status} ${await geminiRes.text()}` }, 502);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return json({ ok: false, error: "AI returned invalid JSON, please try again" }, 502);
    }

    // ---- Validate before trusting ANY of it ----
    if (!["reorder", "no_action"].includes(parsed.action)) {
      return json({ ok: false, error: "AI returned an unrecognised action" }, 502);
    }

    if (parsed.action === "no_action") {
      // Nothing to draft - tell the manager why, don't write a row.
      return json({ ok: true, message: parsed.reasoning ?? "AI recommends no reorder at this time." });
    }

    const validSupplierIds = supplierOptions.map((s) => s.supplier_id);
    const quantityValid = Number.isInteger(parsed.recommended_quantity) && parsed.recommended_quantity > 0;
    const supplierValid = validSupplierIds.includes(parsed.recommended_supplier_id);

    if (!quantityValid || !supplierValid) {
      // The model hallucinated a supplier or gave a bad quantity - reject rather than save garbage.
      return json({
        ok: false,
        error: "AI response failed validation (bad quantity or unknown supplier) - please try again",
      }, 502);
    }

    // ---- 5. Insert the DRAFT (unchanged from Phase 2) ----
    const { data: recommendation, error: insertErr } = await supabase
      .from("purchase_recommendations")
      .insert({
        product_id: product.id,
        status: "draft",
        recommended_action: "reorder",
        recommended_quantity: parsed.recommended_quantity,
        recommended_supplier_id: parsed.recommended_supplier_id,
        reasoning: parsed.reasoning,
        raw_ai_response: { source: "gemini", model: MODEL, context: userContext, response: parsed },
      })
      .select()
      .single();

    if (insertErr) return json({ ok: false, error: insertErr.message }, 500);
    return json({ ok: true, recommendation });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});