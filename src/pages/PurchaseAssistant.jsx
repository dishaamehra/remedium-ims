// ============================================================
// src/pages/PurchaseAssistant.jsx (Phase 2)
//
// Add to App.jsx:
//   <Route path="/purchase-assistant" element={<PurchaseAssistant />} />
// Add to AppLayout.jsx navItems (same AUTOMATION section as /agent):
//   { label: 'Purchase Assistant', path: '/purchase-assistant', icon: ShoppingBag, section: 'AUTOMATION' },
// And to pageTitles:
//   '/purchase-assistant': 'Purchase Assistant',
// (Bot/ShoppingBag from lucide-react - add ShoppingBag to the import list)
// ============================================================

import { useEffect, useState } from 'react';
import { ShoppingBag, Check, X, RefreshCw, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PurchaseAssistant() {
  const [lowStock, setLowStock] = useState([]);
  const [drafts, setDrafts] = useState({});       // product_id -> recommendation row
  const [supplierOpts, setSupplierOpts] = useState({}); // product_id -> [{supplier_id, name, unit_cost, ...}]
  const [orders, setOrders] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    const { data: lowStockData } = await supabase.from('low_stock_products').select('*');
    const ids = (lowStockData ?? []).map((p) => p.id);

    const [draftsRes, suppliersRes, ordersRes] = await Promise.all([
      ids.length
        ? supabase.from('purchase_recommendations').select('*').eq('status', 'draft').in('product_id', ids)
        : { data: [] },
      ids.length
        ? supabase.from('product_suppliers').select('*, suppliers(name)').in('product_id', ids)
        : { data: [] },
      supabase
        .from('purchase_orders')
        .select('*, suppliers(name), purchase_order_items(*, products(name))')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const draftMap = {};
    (draftsRes.data ?? []).forEach((d) => { draftMap[d.product_id] = d; });

    const supplierMap = {};
    (suppliersRes.data ?? []).forEach((s) => {
      supplierMap[s.product_id] = [...(supplierMap[s.product_id] ?? []), s];
    });

    setLowStock(lowStockData ?? []);
    setDrafts(draftMap);
    setSupplierOpts(supplierMap);
    setOrders(ordersRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function generate(productId) {
    setLoadingId(productId);
    const { data, error } = await supabase.functions.invoke('generate-recommendation', {
      body: { product_id: productId },
    });
    if (error || !data?.ok) {
      alert(`Couldn't generate a recommendation: ${error?.message ?? data?.error ?? 'unknown error'}`);
    } else if (data.recommendation) {
      setDrafts((prev) => ({ ...prev, [productId]: data.recommendation }));
    } else {
      alert(data.message ?? 'Nothing to do for this product.');
    }
    setLoadingId(null);
  }

  async function reject(rec) {
    await supabase.from('purchase_recommendations').update({ status: 'rejected' }).eq('id', rec.id);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[rec.product_id];
      return next;
    });
  }

  async function approve(rec, quantity, supplierId) {
    setLoadingId(rec.product_id);
    const { data, error } = await supabase.functions.invoke('approve-recommendation', {
      body: {
        recommendation_id: rec.id,
        final_quantity: quantity,
        final_supplier_id: supplierId,
      },
    });
    if (error || !data?.ok) {
      alert(`Approval failed: ${error?.message ?? data?.error ?? 'unknown error'}`);
    } else {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[rec.product_id];
        return next;
      });
      await fetchAll(); // refresh so the new PO shows up below
    }
    setLoadingId(null);
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><ShoppingBag size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Purchase Assistant</h1>
          <p className="page-subtitle">
            Drafts a reorder recommendation for review — nothing is ordered until you approve it.
          </p>
        </div>
        <button className="btn-primary" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={15} style={{ marginRight: 6 }} /> Refresh
        </button>
      </div>

      <div className="card">
        <h2>Low stock products</h2>
        {loading && <p>Loading…</p>}
        {!loading && lowStock.length === 0 && <p style={{ opacity: 0.7 }}>Nothing is below threshold right now.</p>}

        {lowStock.map((product) => {
          const draft = drafts[product.id];
          const options = supplierOpts[product.id] ?? [];
          return (
            <div key={product.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border, #eee)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{product.name}</strong>{' '}
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    ({product.sku}) · stock {product.stock_quantity} / threshold {product.low_stock_threshold}
                  </span>
                </div>
                {!draft && (
                  <button
                    className="btn-primary"
                    onClick={() => generate(product.id)}
                    disabled={loadingId === product.id}
                  >
                    {loadingId === product.id ? 'Generating…' : 'Generate Purchase Recommendation'}
                  </button>
                )}
              </div>

              {draft && (
                <RecommendationCard
                  draft={draft}
                  options={options}
                  busy={loadingId === product.id}
                  onApprove={(qty, supId) => approve(draft, qty, supId)}
                  onReject={() => reject(draft)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2><Truck size={17} style={{ verticalAlign: 'middle', marginRight: 6 }} />Recent purchase orders</h2>
        {orders.length === 0 && <p style={{ opacity: 0.7 }}>No purchase orders yet.</p>}
        {orders.map((po) => (
          <div key={po.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border, #eee)', fontSize: 13 }}>
            <strong>{po.po_number}</strong> · {po.suppliers?.name} · ₹{po.total_amount} · status: {po.status}
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              {(po.purchase_order_items ?? []).map((it) => `${it.products?.name} × ${it.quantity}`).join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Editable recommendation card: manager can change qty/supplier
// before approving. Pre-filled with the system's suggestion.
// ------------------------------------------------------------
function RecommendationCard({ draft, options, busy, onApprove, onReject }) {
  const [quantity, setQuantity] = useState(draft.recommended_quantity ?? 1);
  const [supplierId, setSupplierId] = useState(draft.recommended_supplier_id);

  const quantityValid = Number.isInteger(Number(quantity)) && Number(quantity) > 0;

  return (
    <div style={{
      marginTop: 10, padding: 12, borderRadius: 8,
      background: 'var(--bg-0, #f7f7f7)', border: '1px solid var(--border, #eee)',
    }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <label style={{ fontSize: 12 }}>
          Quantity
          <br />
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: 90, padding: 4 }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          Supplier
          <br />
          <select value={supplierId ?? ''} onChange={(e) => setSupplierId(Number(e.target.value))} style={{ padding: 4 }}>
            {options.map((o) => (
              <option key={o.supplier_id} value={o.supplier_id}>
                {o.suppliers?.name} — ₹{o.unit_cost} ({o.lead_time_days}d{o.preferred ? ', preferred' : ''})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p style={{ fontSize: 12.5, fontStyle: 'italic', opacity: 0.85, margin: '6px 0' }}>
        {draft.reasoning}
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn-primary"
          disabled={busy || !quantityValid}
          onClick={() => onApprove(Number(quantity), supplierId)}
        >
          <Check size={14} style={{ marginRight: 4 }} /> {busy ? 'Working…' : 'Approve & Create PO'}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={onReject}>
          <X size={14} style={{ marginRight: 4 }} /> Reject
        </button>
      </div>
    </div>
  );
}
