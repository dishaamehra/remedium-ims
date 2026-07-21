// ============================================================
// approve-recommendation
// supabase/functions/approve-recommendation/index.ts
//
// This function NEVER calls the LLM and generate-recommendation
// NEVER writes a purchase_order. That split is the security
// boundary: only this function is allowed to commit real money.
//
// Deploy: supabase functions deploy approve-recommendation
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { recommendation_id, final_quantity, final_supplier_id } = await req.json();

    if (!recommendation_id || !final_supplier_id) {
      return json({ ok: false, error: "recommendation_id and final_supplier_id are required" }, 400);
    }
    const quantity = Number(final_quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return json({ ok: false, error: "final_quantity must be a positive whole number" }, 400);
    }

    // ---- 1. Load the recommendation, must still be a draft ----
    const { data: rec, error: recErr } = await supabase
      .from("purchase_recommendations")
      .select("*")
      .eq("id", recommendation_id)
      .single();
    if (recErr || !rec) return json({ ok: false, error: "Recommendation not found" }, 404);
    if (rec.status !== "draft") {
      return json({ ok: false, error: `This recommendation was already ${rec.status}` }, 409);
    }

    // ---- 2. Confirm the chosen supplier actually supplies this product, get real cost ----
    const { data: link, error: linkErr } = await supabase
      .from("product_suppliers")
      .select("unit_cost")
      .eq("product_id", rec.product_id)
      .eq("supplier_id", final_supplier_id)
      .single();
    if (linkErr || !link) {
      return json({ ok: false, error: "That supplier is not linked to this product" }, 400);
    }

    const totalAmount = Number(link.unit_cost) * quantity;

    // ---- 3. Generate a PO number ----
    const { count } = await supabase
      .from("purchase_orders")
      .select("*", { count: "exact", head: true });
    const poNumber = `PO-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, "0")}`;

    // ---- 4. Create the real Purchase Order (only place this ever happens) ----
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: poNumber,
        supplier_id: final_supplier_id,
        source_recommendation_id: rec.id,
        status: "pending",
        total_amount: totalAmount,
      })
      .select()
      .single();
    if (poErr) return json({ ok: false, error: poErr.message }, 500);

    const { data: item, error: itemErr } = await supabase
      .from("purchase_order_items")
      .insert({
        purchase_order_id: po.id,
        product_id: rec.product_id,
        quantity,
        unit_cost: link.unit_cost,
      })
      .select()
      .single();
    if (itemErr) return json({ ok: false, error: itemErr.message }, 500);

    // ---- 5. Mark the recommendation decided ----
    await supabase
      .from("purchase_recommendations")
      .update({
        status: "approved",
        final_quantity: quantity,
        final_supplier_id,
        decided_at: new Date().toISOString(),
      })
      .eq("id", rec.id);

    return json({ ok: true, purchase_order: po, item });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});
