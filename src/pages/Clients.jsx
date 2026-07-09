import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Modal } from '../components/Modal.jsx'
import { Plus, Pencil, Trash2, Search, Globe } from 'lucide-react'

export function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ name: '', email: '', phone: '', company: '', city: '', country: 'India' }); setModal('add') }
  const openEdit = (c) => { setForm({ ...c }); setModal(c) }

  const save = async () => {
    if (!form.name) return
    setSaving(true)
    const payload = { name: form.name, email: form.email || null, phone: form.phone || null, company: form.company || null, city: form.city || null, country: form.country || 'India' }
    modal === 'add'
      ? await supabase.from('clients').insert(payload)
      : await supabase.from('clients').update(payload).eq('id', modal.id)
    await load()
    setModal(null)
    setSaving(false)
  }

  const remove = async (id) => {
    if (!confirm('Delete this client?')) return
    await supabase.from('clients').delete().eq('id', id)
    await load()
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="spinner" />

  return (
    <div>
      <div className="flex-between mb-6">
        <div className="search-wrap">
          <Search className="search-icon" />
          <input placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Client</button>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Clients ({filtered.length})</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Location</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 40 }}>No clients found</td></tr>}
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{c.name}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{c.company || '—'}</td>
                  <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{c.email || '—'}</td>
                  <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{c.phone || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Globe size={12} style={{ color: 'var(--ink-3)' }} />
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{[c.city, c.country].filter(Boolean).join(', ')}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(c.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Client' : 'Edit Client'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          <div className="form-grid">
            <div className="form-grid form-grid-2">
              <div className="field"><label>Name *</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Company</label><input value={form.company || ''} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="field"><label>Email</label><input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="field"><label>City</label><input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="field"><label>Country</label>
                <select value={form.country || 'India'} onChange={e => setForm({ ...form, country: e.target.value })}>
                  {['India', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Other'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
