import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Modal } from '../components/Modal.jsx'
import { PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react'

export function Inventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [adjustModal, setAdjustModal] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ amount: '', reason: '', type: 'add' })
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all') // all | low

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('name')
    setProducts(data || [])

    const { data: logData } = await supabase
      .from('stock_logs')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(20)
    setLogs(logData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdjust = (p, type) => {
    setAdjustModal(p)
    setAdjustForm({ amount: '', reason: '', type })
  }

  const saveAdjust = async () => {
    const amt = Number(adjustForm.amount)
    if (!amt || amt <= 0) return
    setSaving(true)
    const change = adjustForm.type === 'add' ? amt : -amt
    const newQty = Math.max(0, adjustModal.stock_quantity + change)

    await supabase.from('products').update({ stock_quantity: newQty, updated_at: new Date().toISOString() }).eq('id', adjustModal.id)
    await supabase.from('stock_logs').insert({
      product_id: adjustModal.id,
      change_amount: change,
      reason: adjustForm.reason || (adjustForm.type === 'add' ? 'Stock added' : 'Stock removed'),
    })
    await load()
    setAdjustModal(null)
    setSaving(false)
  }

  const displayed = filter === 'low'
    ? products.filter(p => p.stock_quantity <= p.low_stock_threshold)
    : products

  if (loading) return <div className="spinner" />

  const lowCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length

  return (
    <div>
      {lowCount > 0 && (
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={15} />
          <strong>{lowCount} products</strong> need restocking.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <div>
          <div className="flex-between mb-4">
            <div className="flex gap-2">
              <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>All ({products.length})</button>
              <button className={`btn btn-sm ${filter === 'low' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('low')}>⚠ Low Stock ({lowCount})</button>
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Product</th><th>Category</th><th>In Stock</th><th>Threshold</th><th>Status</th><th>Adjust</th>
                </tr></thead>
                <tbody>
                  {displayed.map(p => {
                    const isLow = p.stock_quantity <= p.low_stock_threshold
                    const pct = Math.min(100, p.low_stock_threshold > 0
                      ? Math.round((p.stock_quantity / (p.low_stock_threshold * 3)) * 100)
                      : 100)
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{p.sku}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.categories?.name || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.stock_quantity} {p.unit}</span>
                            <div className="progress" style={{ width: 80 }}>
                              <div className="progress-fill" style={{ width: `${pct}%`, background: isLow ? 'var(--red)' : pct < 60 ? 'var(--accent)' : 'var(--green)' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{p.low_stock_threshold} {p.unit}</td>
                        <td>
                          {isLow
                            ? <span className="badge badge-red">Low Stock</span>
                            : <span className="badge badge-green">OK</span>}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openAdjust(p, 'add')} title="Add stock" style={{ color: 'var(--green)' }}>
                              <PlusCircle size={15} />
                            </button>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openAdjust(p, 'remove')} title="Remove stock" style={{ color: 'var(--red)' }}>
                              <MinusCircle size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit log */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header"><span className="card-title">Stock Audit Log</span></div>
          <div style={{ padding: '8px 0' }}>
            {logs.length === 0 && <p style={{ padding: '16px 20px', color: 'var(--ink-3)', fontSize: 13 }}>No adjustments yet</p>}
            {logs.map(l => (
              <div key={l.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(42,46,61,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>{l.products?.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: l.change_amount > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {l.change_amount > 0 ? '+' : ''}{l.change_amount}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {l.reason} · {new Date(l.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {adjustModal && (
        <Modal
          title={`${adjustForm.type === 'add' ? 'Add' : 'Remove'} Stock — ${adjustModal.name}`}
          onClose={() => setAdjustModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setAdjustModal(null)}>Cancel</button>
            <button className={`btn ${adjustForm.type === 'add' ? 'btn-primary' : 'btn-danger'}`} onClick={saveAdjust} disabled={saving}>
              {saving ? 'Saving…' : adjustForm.type === 'add' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </>}
        >
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-0)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>CURRENT STOCK</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--font-display)' }}>{adjustModal.stock_quantity} <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{adjustModal.unit}</span></div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Quantity to {adjustForm.type === 'add' ? 'Add' : 'Remove'} *</label>
              <input type="number" min="1" value={adjustForm.amount} onChange={e => setAdjustForm({ ...adjustForm, amount: e.target.value })} placeholder="e.g. 50" autoFocus />
            </div>
            <div className="field">
              <label>Reason / Note</label>
              <input value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder={adjustForm.type === 'add' ? 'e.g. New shipment received' : 'e.g. Sold to client'} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
