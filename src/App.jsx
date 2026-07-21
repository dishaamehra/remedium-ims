import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/AppLayout.jsx'
import AgentActivity from './pages/AgentActivity'
import { SetupScreen } from './components/SetupScreen.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { Products } from './pages/Products.jsx'
import { Inventory } from './pages/Inventory.jsx'
import { Orders } from './pages/Orders.jsx'
import { Clients } from './pages/Clients.jsx'
import { Tasks } from './pages/Tasks.jsx'
import { Employees } from './pages/Employees.jsx'
import PurchaseAssistant from './pages/PurchaseAssistant'

const isConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  return url && url !== 'https://YOUR_PROJECT_ID.supabase.co' && url.includes('supabase.co')
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ims-theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ims-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  if (!isConfigured()) return <SetupScreen />

  return (
    <AppLayout toggleTheme={toggleTheme} theme={theme}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/agent" element={<AgentActivity />} />
        <Route path="/purchase-assistant" element={<PurchaseAssistant />} />
      </Routes>
    </AppLayout>
  )
}