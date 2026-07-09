# Remedium IMS — Inventory & Order Management System

A full-stack web application built for Remedium Enterprises Pvt. Ltd.
Internship project by **Dishaa Mehra** (Software Development Intern)

**Tech Stack:** React · Vite · Supabase (PostgreSQL) · Recharts · Vercel

---

## Live Setup (20 minutes, free)

### Step 1 — Supabase (Database + Backend)

1. Go to [supabase.com](https://supabase.com) → Create account → New Project
2. Name: `remedium-ims` | Region: South Asia (Singapore)
3. After project loads: **SQL Editor → New Query**
4. Paste entire contents of `supabase_schema.sql` → **Run**
5. Go to **Project Settings → API** and copy:
   - Project URL
   - anon / public key

### Step 2 — Local Setup

```bash
git clone <your-repo-url>
cd remedium-ims

# Create env file
cp .env.example .env.local

# Edit .env.local and paste your Supabase credentials
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...

npm install
npm run dev
```

Open http://localhost:5173

### Step 3 — Deploy to Vercel (Free)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import GitHub repo
3. Framework: Vite (auto-detected)
4. **Environment Variables** (add both):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy → get a `*.vercel.app` URL instantly

---

## Features

| Module | What it does |
|--------|-------------|
| **Dashboard** | Live stats, low-stock alerts, order status charts, recent activity |
| **Products** | Full CRUD — add/edit/delete products with SKU, category, price |
| **Inventory** | Stock adjustments (+/-), progress bars, full audit log |
| **Orders** | Create orders with line items, status pipeline, total calculation |
| **Clients** | Client CRM — name, company, email, location |
| **Tasks** | Kanban board — Todo/In Progress/Done, priority, due dates |
| **Employees** | Team directory with open task counts |

---

## Database Schema (Interview Reference)

```
categories (id, name, description)
    ↑
products (id, name, sku, category_id→, stock_quantity, low_stock_threshold, price, unit)
    ↑                    ↑
order_items (id, order_id→, product_id→, quantity, unit_price, subtotal[computed])
    ↑
orders (id, order_number, client_id→, status, total_amount, notes)
                              ↑
clients (id, name, email, phone, company, city, country)

employees (id, name, role, email, department)
    ↑
tasks (id, title, assigned_to→, priority, status, due_date)

stock_logs (id, product_id→, change_amount, reason, created_at)
```

**DBMS Concepts Used:**
- **Normalization (3NF):** Each table has one responsibility. No transitive dependencies.
- **Foreign Keys:** orders→clients, order_items→orders, order_items→products, tasks→employees
- **Computed Column:** `subtotal` in order_items = quantity × unit_price (PostgreSQL generated column)
- **CHECK constraints:** status ENUM via CHECK, stock_quantity ≥ 0
- **Transactions:** Stock updates are atomic — stock_logs and products update together
- **Indexes:** Primary keys are auto-indexed; SKU has UNIQUE constraint (implicit index)

**CN Concepts Used:**
- **REST API:** Supabase exposes the PostgreSQL DB as a RESTful HTTP API
- **HTTP Methods:** GET (fetch data), POST (insert), PATCH (update), DELETE
- **Client-Server Architecture:** React frontend (client) ↔ Supabase (server)
- **JSON over HTTPS:** All data transferred as JSON
- **Stateless requests:** Every API call is independent

**OS Concepts Used:**
- **Race conditions:** Concurrent stock updates are handled via Supabase row-level locking
- **Audit logging:** stock_logs table = OS-style process/event log
- **ACID Transactions:** Atomicity ensures order creation + stock deduction never partially fail

**OOP Concepts Used:**
- **Encapsulation:** Supabase client is a singleton exported from `lib/supabase.js`
- **Abstraction:** Modal, AppLayout are reusable components hiding implementation
- **Composition:** Orders composed of OrderItems; AppLayout composed of Sidebar + TopBar

---

## Project Structure

```
src/
├── lib/
│   └── supabase.js          # Supabase client (singleton)
├── components/
│   ├── AppLayout.jsx         # Shell: sidebar + topbar
│   ├── Modal.jsx             # Reusable modal dialog
│   └── SetupScreen.jsx       # Shown when env vars missing
├── pages/
│   ├── Dashboard.jsx         # Stats + charts
│   ├── Products.jsx          # Product CRUD
│   ├── Inventory.jsx         # Stock management
│   ├── Orders.jsx            # Order lifecycle
│   ├── Clients.jsx           # Client CRM
│   ├── Tasks.jsx             # Kanban task board
│   └── Employees.jsx         # Team directory
├── App.jsx                   # Router
├── main.jsx                  # Entry point
└── index.css                 # Design system
```
