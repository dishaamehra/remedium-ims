import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Modal } from '../components/Modal.jsx'
import { PriorityBadge } from './Dashboard.jsx'
import { Plus, Check, Clock, Circle } from 'lucide-react'

const STATUSES = ['todo', 'in_progress', 'done']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const STATUS_ICON = { todo: Circle, in_progress: Clock, done: Check }
const STATUS_COLOR = { todo: 'var(--ink-3)', in_progress: 'var(--blue)', done: 'var(--green)' }

export function Tasks() {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('active') // active | done | all

  const load = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, employees(name)')
      .order('due_date', { nullsLast: true })
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('employees').select('id, name').order('name').then(({ data }) => setEmployees(data || []))
  }, [])

  const openAdd = () => {
    setForm({ title: '', description: '', assigned_to: '', priority: 'medium', status: 'todo', due_date: '' })
    setModal('add')
  }
  const openEdit = (t) => { setForm({ ...t, assigned_to: t.assigned_to || '' }); setModal(t) }

  const save = async () => {
    if (!form.title) return
    setSaving(true)
    const payload = {
      title: form.title, description: form.description || null,
      assigned_to: form.assigned_to || null,
      priority: form.priority, status: form.status,
      due_date: form.due_date || null,
      updated_at: new Date().toISOString()
    }
    modal === 'add'
      ? await supabase.from('tasks').insert(payload)
      : await supabase.from('tasks').update(payload).eq('id', modal.id)
    await load()
    setModal(null)
    setSaving(false)
  }

  const quickStatus = async (id, status) => {
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  const remove = async (id) => {
    if (!confirm('Delete task?')) return
    await supabase.from('tasks').delete().eq('id', id)
    await load()
  }

  const displayed = tasks.filter(t => {
    if (filterStatus === 'active') return t.status !== 'done'
    if (filterStatus === 'done') return t.status === 'done'
    return true
  })

  const isOverdue = (t) => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()

  if (loading) return <div className="spinner" />

  // Group by status for kanban-like view
  const byStatus = {
    todo: displayed.filter(t => t.status === 'todo'),
    in_progress: displayed.filter(t => t.status === 'in_progress'),
    done: displayed.filter(t => t.status === 'done'),
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <div className="flex gap-2">
          {['active', 'done', 'all'].map(f => (
            <button key={f} className={`btn btn-sm ${filterStatus === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterStatus(f)}>
              {f === 'active' ? `Active (${tasks.filter(t => t.status !== 'done').length})`
                : f === 'done' ? `Done (${tasks.filter(t => t.status === 'done').length})`
                : `All (${tasks.length})`}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Task</button>
      </div>

      {/* Kanban columns */}
      {filterStatus !== 'done' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          {(filterStatus === 'all' ? STATUSES : ['todo', 'in_progress']).map(col => {
            const Icon = STATUS_ICON[col]
            return (
              <div key={col} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={14} style={{ color: STATUS_COLOR[col] }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                    {col.replace('_', ' ')} ({byStatus[col]?.length || 0})
                  </span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                  {(byStatus[col] || []).map(t => (
                    <TaskCard key={t.id} task={t} overdue={isOverdue(t)} onEdit={openEdit} onQuickStatus={quickStatus} onDelete={remove} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed table */}
      {(filterStatus === 'done' || filterStatus === 'all') && (
        <div className="card">
          <div className="card-header"><span className="card-title">Completed Tasks</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Task</th><th>Assigned</th><th>Priority</th><th>Due</th><th>Actions</th></tr></thead>
              <tbody>
                {byStatus.done.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>No completed tasks</td></tr>}
                {byStatus.done.map(t => (
                  <tr key={t.id} style={{ opacity: 0.7 }}>
                    <td style={{ textDecoration: 'line-through', color: 'var(--ink-3)' }}>{t.title}</td>
                    <td style={{ fontSize: 12 }}>{t.employees?.name || '—'}</td>
                    <td><PriorityBadge p={t.priority} /></td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => quickStatus(t.id, 'todo')}>Reopen</button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(t.id)}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'New Task' : 'Edit Task'} onClose={() => setModal(null)}
          footer={<>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          <div className="form-grid">
            <div className="field"><label>Task Title *</label>
              <input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Follow up with Matrix Printers" autoFocus /></div>
            <div className="field"><label>Description</label>
              <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="form-grid form-grid-2">
              <div className="field"><label>Assign To</label>
                <select value={form.assigned_to || ''} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">— Unassigned —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select></div>
              <div className="field"><label>Due Date</label>
                <input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="form-grid form-grid-2">
              <div className="field"><label>Priority</label>
                <select value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select></div>
              <div className="field"><label>Status</label>
                <select value={form.status || 'todo'} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TaskCard({ task, overdue, onEdit, onQuickStatus, onDelete }) {
  const NEXT_STATUS = { todo: 'in_progress', in_progress: 'done' }
  const NEXT_LABEL = { todo: 'Start', in_progress: 'Mark Done' }

  return (
    <div style={{
      background: 'var(--bg-0)', border: `1px solid ${overdue ? 'rgba(242,95,92,0.3)' : 'var(--border)'}`,
      borderRadius: 8, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', flex: 1, marginRight: 8 }}>{task.title}</span>
        <PriorityBadge p={task.priority} />
      </div>
      {task.description && <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, lineHeight: 1.4 }}>{task.description}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: overdue ? 'var(--red)' : 'var(--ink-3)' }}>
          {task.employees?.name?.split(' ')[0] || 'Unassigned'}
          {task.due_date && ` · ${overdue ? '⚠ ' : ''}${new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        </div>
        <div className="flex gap-2">
          {NEXT_STATUS[task.status] && (
            <button className="btn btn-ghost btn-sm" onClick={() => onQuickStatus(task.id, NEXT_STATUS[task.status])} style={{ fontSize: 11, padding: '3px 8px' }}>
              {NEXT_LABEL[task.status]}
            </button>
          )}
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(task)} style={{ padding: '3px 6px' }}>✎</button>
        </div>
      </div>
    </div>
  )
}
