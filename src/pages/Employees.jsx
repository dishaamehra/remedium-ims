import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Modal } from '../components/Modal.jsx'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const DEPT_COLORS = {
  Management: 'badge-yellow', Sales: 'badge-blue', Technical: 'badge-purple',
  Operations: 'badge-green', IT: 'badge-red',
}

export function Employees() {
  const [employees, setEmployees] = useState([])
  const [taskCounts, setTaskCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [{ data: emps }, { data: tasks }] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('tasks').select('assigned_to, status').neq('status', 'done')
    ])
    setEmployees(emps || [])
    const counts = {}
    ;(tasks || []).forEach(t => { counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1 })
    setTaskCounts(counts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ name: '', role: '', email: '', department: 'Sales' }); setModal('add') }
  const openEdit = (e) => { setForm({ ...e }); setModal(e) }

  const save = async () => {
    if (!form.name) return
    setSaving(true)
    const payload = { name: form.name, role: form.role || null, email: form.email || null, department: form.department || null }
    modal === 'add'
      ? await supabase.from('employees').insert(payload)
      : await supabase.from('employees').update(payload).eq('id', modal.id)
    await load()
    setModal(null)
    setSaving(false)
  }

  const remove = async (id) => {
    if (!confirm('Remove this employee?')) return
    await supabase.from('employees').delete().eq('id', id)
    await load()
  }

  if (loading) return <div className="spinner" />

  return (
    <div>
      <div className="flex-between mb-6">
        <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{employees.length} team members</span>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Employee</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {employees.map(e => (
          <div key={e.id} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid rgba(232,168,56,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--accent)' }}>
                {e.name.charAt(0)}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(e)}><Pencil size={12} /></button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(e.id)}><Trash2 size={12} /></button>
              </div>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{e.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>{e.role || '—'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {e.department && <span className={`badge ${DEPT_COLORS[e.department] || 'badge-gray'}`}>{e.department}</span>}
              {taskCounts[e.id] > 0 && <span className="badge badge-yellow">{taskCounts[e.id]} open tasks</span>}
            </div>
            {e.email && <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{e.email}</div>}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Employee' : 'Edit Employee'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          <div className="form-grid">
            <div className="form-grid form-grid-2">
              <div className="field"><label>Name *</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>Role / Title</label><input value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Sales Manager" /></div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="field"><label>Email</label><input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Department</label>
                <select value={form.department || 'Sales'} onChange={e => setForm({ ...form, department: e.target.value })}>
                  {['Management', 'Sales', 'Technical', 'Operations', 'IT', 'Finance'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
