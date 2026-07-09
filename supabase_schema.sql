-- ============================================================
-- REMEDIUM IMS - DATABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  unit VARCHAR(30) DEFAULT 'units',
  stock_quantity INT DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INT DEFAULT 10,
  price NUMERIC(10,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  company VARCHAR(200),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(100),
  email VARCHAR(200),
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT REFERENCES clients(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','dispatched','delivered','cancelled')),
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS (junction table - DBMS 3NF)
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- 7. TASKS TABLE (employee tracker)
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to INT REFERENCES employees(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  status VARCHAR(30) DEFAULT 'todo'
    CHECK (status IN ('todo','in_progress','done')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. STOCK AUDIT LOG (OS concept: audit trail / logging)
CREATE TABLE IF NOT EXISTS stock_logs (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  change_amount INT NOT NULL,
  reason VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA - Sample records for demo
-- ============================================================

INSERT INTO categories (name, description) VALUES
  ('Offset Printing Blankets', 'Blankets used in offset printing machines'),
  ('UV Curing Systems', 'LED and Mercury UV curing equipment'),
  ('Printing Inks', 'UV, LED, and conventional inks'),
  ('Press Room Chemicals', 'Wash, fountain solutions, cleaners'),
  ('Anilox Rollers', 'Chrome and ceramic anilox rollers')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, sku, category_id, unit, stock_quantity, low_stock_threshold, price) VALUES
  ('Spectrum UV STRIP', 'SPE-UV-001', 1, 'rolls', 45, 10, 2800),
  ('Spectrum VELOCITY 1.7', 'SPE-VEL-17', 1, 'rolls', 8, 10, 3200),
  ('Recure Eco Series Ink', 'REC-ECO-001', 3, 'kg', 120, 20, 450),
  ('UV Wash Solution', 'UVW-001', 4, 'litre', 60, 15, 180),
  ('Conventional Wash', 'CWS-001', 4, 'litre', 35, 15, 150),
  ('Chrome Anilox Roller 200LPI', 'ANX-CR-200', 5, 'units', 6, 3, 12000),
  ('LED UV Curing System 400W', 'LED-400W', 2, 'units', 4, 2, 85000),
  ('Fountain Solution IPA-Free', 'FNT-IPA-FREE', 4, 'litre', 18, 10, 220),
  ('Spectrum BOLT 1.95', 'SPE-BLT-195', 1, 'rolls', 22, 10, 3800),
  ('Infrared Excitation Ink', 'INK-IR-001', 3, 'kg', 14, 5, 1200)
ON CONFLICT DO NOTHING;

INSERT INTO clients (name, email, phone, company, city, country) VALUES
  ('Rajesh Kumar', 'rajesh@matrixprint.in', '9876543210', 'Matrix Printers Corporate', 'Mumbai', 'India'),
  ('Pallavi Tayal', 'pallavi@printco.in', '9812345678', 'PrintCo India', 'Delhi', 'India'),
  ('Sujab Ali', 'sujab@dhaka-pack.com', '01712345678', 'Dhaka Packaging Ltd', 'Dhaka', 'Bangladesh'),
  ('Mritunjay Singh', 'mritunjay@shreeprint.in', '9934567890', 'Shree Printing House', 'Kolkata', 'India'),
  ('Akila Warnakula', 'akila@ceylonpack.lk', '0771234567', 'Ceylon Packaging', 'Colombo', 'Sri Lanka')
ON CONFLICT DO NOTHING;

INSERT INTO employees (name, role, email, department) VALUES
  ('Kanav Chadda', 'CMD / Director', 'kanav@remedium.co.in', 'Management'),
  ('Rahul Sharma', 'Sales Manager', 'rahul@remedium.co.in', 'Sales'),
  ('Priya Verma', 'Technical Support', 'priya@remedium.co.in', 'Technical'),
  ('Amit Gupta', 'Warehouse Incharge', 'amit@remedium.co.in', 'Operations'),
  ('Dishaa Mehra', 'Software Development Intern', 'dishaa@remedium.co.in', 'IT')
ON CONFLICT DO NOTHING;

-- Sample orders
INSERT INTO orders (order_number, client_id, status, total_amount, notes) VALUES
  ('ORD-2026-001', 1, 'delivered', 14000, 'Urgent blanket order for Mumbai press'),
  ('ORD-2026-002', 2, 'dispatched', 2160, 'Monthly chemical restock'),
  ('ORD-2026-003', 3, 'confirmed', 85000, 'LED UV system for new press line'),
  ('ORD-2026-004', 4, 'pending', 6000, 'Ink order - awaiting payment confirmation'),
  ('ORD-2026-005', 1, 'confirmed', 19000, 'Blankets + wash solution combo')
ON CONFLICT DO NOTHING;

-- Sample tasks
INSERT INTO tasks (title, description, assigned_to, priority, status, due_date) VALUES
  ('Follow up with Matrix Printers', 'Check on delivery satisfaction for ORD-2026-001', 2, 'high', 'todo', '2026-05-28'),
  ('Update product catalog PDF', 'Add new Spectrum BOLT specs to catalog', 3, 'medium', 'in_progress', '2026-05-30'),
  ('Stock count - Anilox rollers', 'Physical verification of roller inventory', 4, 'high', 'todo', '2026-05-26'),
  ('Prepare Bangladesh shipment docs', 'Export documents for ORD-2026-003', 2, 'urgent', 'in_progress', '2026-05-25'),
  ('Update IMS with new products', 'Add 5 new UV coating products to database', 5, 'medium', 'todo', '2026-06-01'),
  ('Quarterly client report', 'Compile Q1 2026 order summary for management', 5, 'low', 'todo', '2026-06-10')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Enable Row Level Security (RLS) - set to open for now
-- In production: add proper auth policies
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon key (for this internship project)
CREATE POLICY "allow_all_categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_stock_logs" ON stock_logs FOR ALL USING (true) WITH CHECK (true);
