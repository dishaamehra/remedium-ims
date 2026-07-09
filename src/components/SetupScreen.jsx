export function SetupScreen() {
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-logo">Remedium <span>IMS</span></div>
        <p style={{ color: 'var(--ink-3)', marginBottom: 28, fontSize: 14 }}>
          Inventory & Order Management System · Setup Required
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Step n="1" title="Create a free Supabase project">
            Go to{' '}
            <a href="https://supabase.com" target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)' }}>supabase.com</a>{' '}
            → New Project (free tier, no credit card needed)
          </Step>

          <Step n="2" title="Run the database schema">
            In your Supabase dashboard → SQL Editor → New Query, paste and run the file:
            <div className="code-block">supabase_schema.sql</div>
            This creates all 8 tables and seeds sample data.
          </Step>

          <Step n="3" title="Add your credentials">
            Copy <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>.env.example</code>{' '}
            to <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>.env.local</code> and fill in:
            <div className="code-block">{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}</div>
            Find these at: Project Settings → API
          </Step>

          <Step n="4" title="Run the dev server">
            <div className="code-block">{`npm install
npm run dev`}</div>
          </Step>

          <Step n="5" title="Deploy to Vercel (free)">
            Push to GitHub, then import repo at{' '}
            <a href="https://vercel.com" target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)' }}>vercel.com</a>.
            Add both env vars in Vercel Project Settings → Environment Variables.
          </Step>
        </div>

        <div style={{ marginTop: 28, padding: '12px 16px', background: 'var(--warning-bg)',
          border: '1px solid rgba(232,168,56,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--accent)' }}>
          💡 This app uses Supabase (PostgreSQL) as the backend — free forever for this scale.
          No AWS needed, real data persists across sessions.
        </div>
      </div>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: 'var(--accent-glow)', border: '1px solid rgba(232,168,56,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)',
        marginTop: 1
      }}>{n}</div>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4, fontSize: 13 }}>{title}</div>
        <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>{children}</div>
      </div>
    </div>
  )
}
