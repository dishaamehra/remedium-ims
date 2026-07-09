import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Modal } from '../components/Modal.jsx'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

export function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'add' | product object
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  const openAdd = () => {
    setForm({ name: '', sku: '', category_id: '', unit: 'units', stock_quantity: 0, low_stock_threshold: 10, price: '', description: '' })
    setModal('add')
    setError('')
  }

  const openEdit = (p) => {
    setForm({ ...p, category_id: p.category_id || '' })
    setModal(p)
    setError('')
  }

  const save = async () => {
    if (!form.name || !form.sku) { setError('Name and SKU are required'); return }
    setSaving(true)
    setError('')
    const payload = {
      name: form.name, sku: form.sku,
      category_id: form.category_id || null,
      unit: form.unit || 'units',
      stock_quantity: Number(form.stock_quantity) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 10,
      price: Number(form.price) || 0,
      description: form.description || null,
      updated_at: new Date().toISOString()
    }

    const { error: err } = modal === 'add'
      ? await supabase.from('products').insert(payload)
      : await supabase.from('products').update(payload).eq('id', modal.id)

    if (err) { setError(err.message); setSaving(false); return }
    await load()
    setModal(null)
    setSaving(false)
  }

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    await load()
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="spinner" />

  return (
    <div>
      <div className="flex-between mb-6">
        <div className="search-wrap">
          <Search className="search-icon" />
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Product</button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Products ({filtered.length})</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Name</th><th>SKU</th><th>Category</th><th>Unit</th>
              <th>Stock</th><th>Price</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 40 }}>No products found</td></tr>
              )}
              {filtered.map(p => {
                const isLow = p.stock_quantity <= p.low_stock_threshold
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</td>
                    <td><span className="text-mono" style={{ fontSize: 12 }}>{p.sku}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.categories?.name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{p.unit}</td>
                    <td>
                      <span className={`badge ${isLow ? 'badge-red' : 'badge-green'}`}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td><span className="text-mono">₹{Number(p.price).toLocaleString('en-IN')}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)} title="Edit"><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(p.id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={modal === 'add' ? 'Add Product' : 'Edit Product'}
          onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}
        >
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <div className="form-grid">
            <div className="form-grid form-grid-2">
              <div className="field"><label>Product Name *</label>
                <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spectrum UV Strip" /></div>
              <div className="field"><label>SKU *</label>
                <input value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. SPE-UV-001" /></div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="field"><label>Category</label>
                <select value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div className="field"><label>Unit</label>
                <select value={form.unit || 'units'} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {['units', 'rolls', 'kg', 'litre', 'metres', 'boxes', 'sets'].map(u => <option key={u}>{u}</option>)}
                </select></div>
            </div>
            <div className="form-grid form-grid-3">
              <div className="field"><label>Stock Qty</label>
                <input type="number" min="0" value={form.stock_quantity ?? 0} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} /></div>
              <div className="field"><label>Low Stock Alert At</label>
                <input type="number" min="0" value={form.low_stock_threshold ?? 10} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
              <div className="field"><label>Price (₹)</label>
                <input type="number" min="0" value={form.price ?? ''} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" /></div>
            </div>
            <div className="field"><label>Description</label>
              <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
