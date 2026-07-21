import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, BarChart2, ShoppingCart,
  Users, CheckSquare, UserCog, Printer, Sun, Moon, Bot, ShoppingBag
} from 'lucide-react'


const navItems = [
  { label: 'Dashboard',    path: '/dashboard', icon: LayoutDashboard, section: 'OVERVIEW' },
  { label: 'Products',     path: '/products',  icon: Package,         section: 'CATALOGUE' },
  { label: 'Inventory',    path: '/inventory', icon: BarChart2,       section: 'CATALOGUE' },
  { label: 'Orders',       path: '/orders',    icon: ShoppingCart,    section: 'OPERATIONS' },
  { label: 'Clients',      path: '/clients',   icon: Users,           section: 'OPERATIONS' },
  { label: 'Tasks',        path: '/tasks',     icon: CheckSquare,     section: 'TEAM' },
  { label: 'Employees',    path: '/employees', icon: UserCog,         section: 'TEAM' },
  { label: 'AI Agent',     path: '/agent',     icon: Bot,             section: 'AUTOMATION' },
  { label: 'Purchase Assistant', path: '/purchase-assistant', icon: ShoppingBag, section: 'AUTOMATION' },
]

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/products':  'Products',
  '/inventory': 'Inventory',
  '/orders':    'Orders',
  '/clients':   'Clients',
  '/tasks':     'Task Tracker',
  '/employees': 'Employees',
  '/agent':     'AI Agent',
  '/purchase-assistant': 'Purchase Assistant',
}

export function AppLayout({ children, toggleTheme, theme }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const sections  = [...new Set(navItems.map(i => i.section))]

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="wordmark" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={18} style={{ color: 'var(--accent)' }} />
            Remedium
          </div>
          <div className="tagline">IMS · Internal Office Tool</div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {navItems.filter(i => i.section === section).map(item => {
                const Icon   = item.icon
                const active = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <Icon className="nav-icon" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          Remedium Enterprises Pvt. Ltd.<br />
          <span style={{ color: 'var(--accent)' }}>remedium.co.in</span>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <header className="topbar">
          <h1 className="topbar-title">
            {pageTitles[location.pathname] || 'Remedium IMS'}
          </h1>

          <div className="topbar-actions">
            {/* Date */}
            <div style={{
              fontSize: 12, fontFamily: 'var(--font-mono)',
              color: 'var(--ink-3)', padding: '4px 10px',
              background: 'var(--bg-0)', border: '1px solid var(--border)',
              borderRadius: 4,
            }}>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric',
                month: 'short', year: 'numeric'
              })}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-icon"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ padding: 7 }}
            >
              {theme === 'dark'
                ? <Sun  size={16} style={{ color: 'var(--ink-2)' }} />
                : <Moon size={16} style={{ color: 'var(--ink-2)' }} />
              }
            </button>
          </div>
        </header>

        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  )
}