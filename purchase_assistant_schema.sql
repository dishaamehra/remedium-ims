-- ============================================================
-- SMART PURCHASE RECOMMENDATION ASSISTANT - PHASE 1 SCHEMA
-- Run this entire file in Supabase SQL Editor (New Query -> paste -> Run)
-- Safe to run after supabase_schema.sql and agent_schema.sql
-- ============================================================

-- 1. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(200),
  phone VARCHAR(20),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCT <-> SUPPLIER (which suppliers offer which product, at what cost)
CREATE TABLE IF NOT EXISTS product_suppliers (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  supplier_id INT REFERENCES suppliers(id) ON DELETE CASCADE,
  unit_cost NUMERIC(10,2) NOT NULL,
  lead_time_days INT DEFAULT 7,
  preferred BOOLEAN DEFAULT FALSE,
  UNIQUE (product_id, supplier_id)
);

-- 3. AI's DRAFT RECOMMENDATION (never money-committing on its own)
CREATE TABLE IF NOT EXISTS purchase_recommendations (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft','approved','rejected')),
  recommended_action VARCHAR(20) DEFAULT 'reorder'
    CHECK (recommended_action IN ('reorder','no_action')),
  recommended_quantity INT,
  recommended_supplier_id INT REFERENCES suppliers(id),
  reasoning TEXT,
  raw_ai_response JSONB,
  final_quantity INT,
  final_supplier_id INT REFERENCES suppliers(id),
  decided_by INT REFERENCES employees(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. REAL PURCHASE ORDER (only ever created after manager approval)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id INT REFERENCES suppliers(id),
  source_recommendation_id INT REFERENCES purchase_recommendations(id),
  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','sent','received','cancelled')),
  total_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id SERIAL PRIMARY KEY,
  purchase_order_id INT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- ============================================================
-- SEED DATA - suppliers + who supplies what
-- Matches products already seeded in supabase_schema.sql
-- ============================================================

INSERT INTO suppliers (name, contact_email, phone, city, country, notes) VALUES
  ('PrintTech Supplies', 'sales@printtech.in', '9811122233', 'Delhi', 'India', 'Long-standing vendor, reliable on UV consumables'),
  ('Global Roller Co', 'orders@globalroller.com', '9822233344', 'Mumbai', 'India', 'Specializes in anilox rollers and press hardware'),
  ('UV Solutions Ltd', 'contact@uvsolutions.in', '9833344455', 'Ahmedabad', 'India', 'Best pricing on UV curing systems and LED units'),
  ('Spectra Chemicals', 'sales@spectrachem.in', '9844455566', 'Kolkata', 'India', 'Wash solutions and press room chemicals')
ON CONFLICT DO NOTHING;

-- Link suppliers to the products that are currently low/near threshold
-- (product ids follow the order they were seeded in supabase_schema.sql)
INSERT INTO product_suppliers (product_id, supplier_id, unit_cost, lead_time_days, preferred) VALUES
  -- Spectrum VELOCITY 1.7 (id 2) - two supplier options
  (2, 1, 2450, 5, true),
  (2, 2, 2600, 3, false),
  -- Chrome Anilox Roller 200LPI (id 6)
  (6, 2, 9800, 10, true),
  -- LED UV Curing System 400W (id 7) - expensive equipment, two options
  (7, 3, 68000, 14, true),
  (7, 2, 71500, 7, false),
  -- Infrared Excitation Ink (id 10)
  (10, 1, 980, 4, true),
  (10, 4, 1050, 6, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- RLS - open for now, same pattern as the rest of the project
-- ============================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_product_suppliers" ON product_suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_purchase_recommendations" ON purchase_recommendations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_purchase_orders" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_purchase_order_items" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);
