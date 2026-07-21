// ============================================================
// REMEDIUM IMS - AGENT ACTIVITY PAGE (Phase 4)
// src/pages/AgentActivity.jsx
//
// Add to App.jsx router:
//   <Route path="/agent" element={<AgentActivity />} />
// Add to the sidebar in AppLayout.jsx:
//   { path: '/agent', label: 'AI Agent', icon: Bot }
//
// Note: class names below assume simple utility classes - swap
// them for whatever your index.css design system uses.
// ============================================================

import { useEffect, useState } from 'react';
import { Bot, Play, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

export default function AgentActivity() {
  const [runs, setRuns] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    const [runsRes, alertsRes] = await Promise.all([
      supabase.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(10),
    ]);
    setRuns(runsRes.data ?? []);
    setAlerts(alertsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // Manual trigger - invokes the Edge Function with trigger: "manual"
  async function runAgentNow() {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke('inventory-agent', {
        body: { trigger: 'manual' },
      });
      if (error) alert(`Agent run failed: ${error.message}`);
      await fetchData(); // refresh to show the new run
    } finally {
      setRunning(false);
    }
  }

  const statusIcon = (status) =>
    status === 'success' ? <CheckCircle2 size={16} color="#16a34a" />
    : status === 'failed' ? <XCircle size={16} color="#dc2626" />
    : <Clock size={16} color="#d97706" />;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Bot size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Inventory Agent</h1>
          <p className="page-subtitle">
            Watches stock levels, creates restock tasks, and alerts the warehouse team. Runs daily at 9 AM.
          </p>
        </div>
        <button className="btn-primary" onClick={runAgentNow} disabled={running}>
          <Play size={15} style={{ marginRight: 6 }} />
          {running ? 'Agent thinking…' : 'Run agent now'}
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={17} color="#d97706" /> Active alerts
          </h2>
          {alerts.map((a) => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border, #eee)' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginRight: 10,
                color: a.severity === 'critical' ? '#dc2626' : a.severity === 'warning' ? '#d97706' : '#2563eb',
              }}>
                {a.severity}
              </span>
              {a.message}
              <span style={{ float: 'right', fontSize: 12, opacity: 0.6 }}>
                {format(new Date(a.created_at), 'dd MMM, HH:mm')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Run history</h2>
        {loading && <p>Loading…</p>}
        {!loading && runs.length === 0 && (
          <p style={{ opacity: 0.7 }}>No runs yet. Press "Run agent now" to trigger the first one.</p>
        )}
        {runs.map((run) => (
          <details key={run.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border, #eee)' }}>
            <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              {statusIcon(run.status)}
              <strong>{format(new Date(run.created_at), 'dd MMM yyyy, HH:mm')}</strong>
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                {run.trigger_type} · {run.low_stock_found} low-stock · {(run.actions_taken ?? []).length} actions
              </span>
            </summary>
            <div style={{ padding: '10px 0 0 26px' }}>
              <p style={{ marginBottom: 8 }}>{run.summary}</p>
              {(run.actions_taken ?? []).map((a, i) => (
                <div key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, padding: '3px 0' }}>
                  → {a.tool}({a.input?.product_name ?? a.input?.message ?? ''})
                  {a.input?.priority ? ` · priority: ${a.input.priority}` : ''}
                  {a.result?.ok ? ' ✓' : ` ✗ ${a.result?.error ?? ''}`}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
