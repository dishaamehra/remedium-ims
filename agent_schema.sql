-- ============================================================
-- REMEDIUM IMS - AGENT LAYER SCHEMA (Phase 1)
-- Run this in Supabase SQL Editor AFTER supabase_schema.sql
-- ============================================================

-- 1. AGENT RUNS - every time the agent wakes up, it logs what it
--    observed, what it decided, and what actions it took.
--    This is your "explainability" table - in the UI you can show
--    exactly why the agent did what it did.
CREATE TABLE IF NOT EXISTS agent_runs (
  id SERIAL PRIMARY KEY,
  trigger_type VARCHAR(30) DEFAULT 'scheduled'
    CHECK (trigger_type IN ('scheduled','manual','stock_change')),
  products_checked INT DEFAULT 0,
  low_stock_found INT DEFAULT 0,
  actions_taken JSONB DEFAULT '[]'::jsonb,   -- list of tool calls the agent made
  summary TEXT,                              -- the LLM's own explanation of its decisions
  status VARCHAR(20) DEFAULT 'success'
    CHECK (status IN ('success','partial','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ALERTS - the agent's "send_alert" tool writes here.
--    The dashboard can read this table to show notifications.
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical')),
  source VARCHAR(50) DEFAULT 'inventory-agent',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LOW STOCK VIEW - the agent's "Observe" step.
--    supabase-js cannot compare two columns directly
--    (stock_quantity <= low_stock_threshold), so we push that
--    logic into the database as a VIEW. Clean DBMS concept to
--    mention in interviews: views encapsulate query logic.
CREATE OR REPLACE VIEW low_stock_products AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.stock_quantity,
  p.low_stock_threshold,
  p.unit,
  p.price,
  c.name AS category,
  -- how far below threshold, as a ratio (0 = completely out of stock)
  ROUND(p.stock_quantity::numeric / NULLIF(p.low_stock_threshold, 0), 2) AS stock_ratio
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.stock_quantity <= p.low_stock_threshold;

-- 4. RLS for the new tables (open for now, same as the rest)
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_agent_runs" ON agent_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);
