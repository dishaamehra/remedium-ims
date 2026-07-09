import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Modal } from '../components/Modal.jsx'
import { StatusBadge } from './Dashboard.jsx'
import { Plus, Eye, ChevronRight } from 'lucide-react'

const STATUSES = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled']

export function Orders() {
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | order obj
  const [viewModal, setViewModal] = useState(null)
  const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1, unit_price: '' }])
  const [form, setForm] = useState({ client_id: '', status: 'pending', notes: '' })
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const load = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, clients(name, company)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('clients').select('id, name, company').order('name').then(({ data }) => setClients(data || []))
    supabase.from('products').select('id, name, price, unit').order('name').then(({ data }) => setProducts(data || []))
  }, [])

  const genOrderNum = () => `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`

  const openAdd = () => {
    setForm({ client_id: '', status: 'pending', notes: '' })
    setOrderItems([{ product_id: '', quantity: 1, unit_price: '' }])
    setModal('add')
  }

  const viewOrder = async (o) => {
    const { data } = await supabase
      .from('order_items')
      .select('*, products(name, unit)')
      .eq('order_id', o.id)
    setViewModal({ ...o, items: data || [] })
  }

  const updateItem = (i, field, val) => {
    const items = [...orderItems]
    items[i] = { ...items[i], [field]: val }
    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(val))
      if (prod) items[i].unit_price = prod.price
    }
    setOrderItems(items)
  }

  const total = orderItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price) || 0), 0)

  const save = async () => {
    if (!form.client_id) return alert('Select a client')
    const validItems = orderItems.filter(i => i.product_id && i.quantity && i.unit_price)
    if (!validItems.length) return alert('Add at least one product')
    setSaving(true)

    const { data: order, error } = await supabase.from('orders').insert({
      order_number: genOrderNum(),
      client_id: form.client_id,
      status: form.status,
      total_amount: total,
      notes: form.notes || null,
    }).select().single()

    if (!error) {
      await supabase.from('order_items').insert(validItems.map(i => ({
        order_id: order.id,
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      })))
    }
    await load()
    setModal(null)
    setSaving(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
    if (viewModal) setViewModal({ ...viewModal, status })
  }

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

  if (loading) return <div className="spinner" />

  return (
    <div>
      <div className="flex-between mb-4">
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {['all', ...STATUSES].map(s => (
            <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterStatus(s)}>
              {s === 'all' ? `All (${orders.length})` : s}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> New Order</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Order #</th><th>Client</th><th>Company</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 40 }}>No orders found</td></tr>
              )}
              {filtered.map(o => (
                <tr key={o.id}>
                  <td><span className="text-mono" style={{ fontSize: 12 }}>{o.order_number}</span></td>
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{o.clients?.name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{o.clients?.company || '—'}</td>
                  <td><span className="text-mono">₹{Number(o.total_amount).toLocaleString('en-IN')}</span></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => viewOrder(o)}><Eye size={13} /> View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Order Modal */}
      {viewModal && (
        <Modal title={`Order — ${viewModal.order_number}`} onClose={() => setViewModal(null)}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-0)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>CLIENT</div>
              <div style={{ fontWeight: 600 }}>{viewModal.clients?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{viewModal.clients?.company}</div>
            </div>
            <div style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-0)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>TOTAL</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>₹{Number(viewModal.total_amount).toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 8, textTransform: 'uppercase' }}>Update Status</div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button key={s} className={`btn btn-sm ${viewModal.status === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateStatus(viewModal.id, s)}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 8, textTransform: 'uppercase' }}>Order Items</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Product', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {viewModal.items?.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 10px', fontSize: 13 }}>{item.products?.name}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{item.quantity} {item.products?.unit}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>₹{Number(item.subtotal).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {viewModal.notes && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-3)', padding: '8px 12px', background: 'var(--bg-0)', borderRadius: 6 }}>{viewModal.notes}</p>}
        </Modal>
      )}

      {/* Add Order Modal */}
      {modal === 'add' && (
        <Modal
          title="New Order"
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create Order'}</button>
          </>}
        >
          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-grid form-grid-2">
              <div className="field"><label>Client *</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">— Select Client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.company}</option>)}
                </select></div>
              <div className="field"><label>Initial Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select></div>
            </div>
            <div className="field"><label>Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" /></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Order Items</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: '' }])}><Plus size={12} /> Add Row</button>
            </div>

            {orderItems.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 28px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  {i === 0 && <label>Product</label>}
                  <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                    <option value="">— Select —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  {i === 0 && <label>Qty</label>}
                  <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  {i === 0 && <label>Unit Price (₹)</label>}
                  <input type="number" min="0" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                </div>
                <button style={{ height: 36, background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, marginTop: i === 0 ? 20 : 0 }}
                  onClick={() => setOrderItems(orderItems.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg-0)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'right' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>TOTAL  </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--accent)' }}>₹{total.toLocaleString('en-IN')}</span>
          </div>
        </Modal>
      )}
    </div>
  )
}
