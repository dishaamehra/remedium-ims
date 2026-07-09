import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Package, ShoppingCart, Users, AlertTriangle, CheckSquare, TrendingUp } from 'lucide-react'

const STATUS_COLORS = {
  pending: '#e8a838',
  confirmed: '#4a9eff',
  dispatched: '#9b79f5',
  delivered: '#3ecf8e',
  cancelled: '#f25f5c',
}

export function Dashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, clients: 0, lowStock: 0, tasks: 0 })
  const [ordersByStatus, setOrdersByStatus] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [recentTasks, setRecentTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: products },
        { count: orders },
        { count: clients },
        { data: lowStockData },
        { count: tasks },
        { data: ordersData },
        { data: recentOrdersData },
        { data: tasksData },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('name, stock_quantity, low_stock_threshold'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done'),
        supabase.from('orders').select('status'),
        supabase.from('orders').select('order_number, status, total_amount, created_at, clients(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('tasks').select('title, priority, status, due_date, employees(name)').neq('status', 'done').order('due_date').limit(5),
      ])

      // low stock needs manual filter since supabase can't filter one column <= another
      const { data: allProducts } = await supabase.from('products').select('name, stock_quantity, low_stock_threshold')
      const actualLowStock = (allProducts || []).filter(p => p.stock_quantity <= p.low_stock_threshold)

      const statusCounts = {}
      ;(ordersData || []).forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1 })
      const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

      setStats({ products, orders, clients, lowStock: actualLowStock.length, tasks })
      setOrdersByStatus(pieData)
      setLowStockItems(actualLowStock)
      setRecentOrders(recentOrdersData || [])
      setRecentTasks(tasksData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="spinner" />

  return (
    <div>
      {stats.lowStock > 0 && (
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={15} />
          <span><strong>{stats.lowStock} products</strong> are below their low-stock threshold. Check Inventory.</span>
        </div>
      )}

      <div className="stats-grid">
        <StatCard icon={Package} label="Total Products" value={stats.products} sub="In catalogue" color="var(--accent)" />
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.orders} sub="All time" color="var(--blue)" />
        <StatCard icon={Users} label="Clients" value={stats.clients} sub="Active clients" color="var(--green)" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} sub="Need reorder" color="var(--red)" />
        <StatCard icon={CheckSquare} label="Open Tasks" value={stats.tasks} sub="Pending / in progress" color="var(--purple)" />
      </div>

      <div className="charts-grid mb-6">
        <div className="card">
          <div className="card-header"><span className="card-title">Orders by Status</span></div>
          <div style={{ padding: '16px 8px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name} (${value})`}>
                  {ordersByStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#5a6080'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--ink)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Low Stock Items</span></div>
          <div style={{ padding: '16px' }}>
            {lowStockItems.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>All products are sufficiently stocked ✓</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lowStockItems.slice(0, 5).map((p, i) => {
                  const pct = Math.min(100, Math.round((p.stock_quantity / (p.low_stock_threshold * 2)) * 100))
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{p.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>{p.stock_quantity} left</span>
                      </div>
                      <div className="progress">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: pct < 30 ? 'var(--red)' : 'var(--accent)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Recent Orders</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Order #</th><th>Client</th><th>Amount</th><th>Status</th>
              </tr></thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.order_number}>
                    <td><span className="text-mono" style={{ fontSize: 12 }}>{o.order_number}</span></td>
                    <td>{o.clients?.name || '—'}</td>
                    <td><span className="text-mono">₹{Number(o.total_amount).toLocaleString('en-IN')}</span></td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Upcoming Tasks</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Task</th><th>Assigned</th><th>Priority</th><th>Due</th>
              </tr></thead>
              <tbody>
                {recentTasks.map((t, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: 160 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>{t.employees?.name?.split(' ')[0] || '—'}</td>
                    <td><PriorityBadge p={t.priority} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ '--accent': color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value ?? '—'}</div>
          <div className="stat-sub">{sub}</div>
        </div>
        <div style={{ padding: 10, background: `${color}15`, borderRadius: 8 }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending: 'badge-yellow', confirmed: 'badge-blue',
    dispatched: 'badge-purple', delivered: 'badge-green', cancelled: 'badge-red'
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export function PriorityBadge({ p }) {
  const map = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red' }
  return <span className={`badge ${map[p] || 'badge-gray'}`}>{p}</span>
}
