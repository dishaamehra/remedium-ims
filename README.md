# 📦 Remedium IMS — Inventory & Order Management System

A full-stack Inventory & Order Management System built for **Remedium Enterprises Pvt. Ltd.** during my Software Development Internship.

🚀 **Live Demo:** https://remedium-ims-dishaa.vercel.app

---

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Supabase
- **Database:** PostgreSQL
- **Charts:** Recharts
- **Deployment:** Vercel

---

# Live Demo

🔗 **Application:** https://remedium-ims-dishaa.vercel.app

---

# Features

| Module | Description |
|---------|-------------|
| 📊 Dashboard | Business insights, live statistics, low-stock alerts, order analytics |
| 📦 Products | Create, update, delete and manage products |
| 📋 Inventory | Stock adjustments with audit logs |
| 🛒 Orders | Complete order management with multiple order items |
| 👥 Clients | Customer and company management |
| ✅ Tasks | Kanban board for employee task tracking |
| 👨‍💼 Employees | Employee directory with assigned tasks |

---

# Database Design

```
categories
    │
products
    │
order_items
    │
orders
    │
clients

employees
    │
tasks

stock_logs
```

### Key Database Concepts

- Third Normal Form (3NF)
- Foreign Key Constraints
- Generated Columns
- CHECK Constraints
- Transactions
- Audit Logging
- Unique Constraints
- Relational Database Design

---

# Computer Science Concepts Used

## Database Management System (DBMS)

- Normalization (3NF)
- Foreign Keys
- Constraints
- Generated Columns
- Transactions
- Indexing

## Computer Networks

- REST APIs
- HTTP Methods
- Client–Server Architecture
- HTTPS Communication
- JSON Data Exchange

## Operating Systems

- ACID Transactions
- Atomic Operations
- Audit Logs
- Concurrent Updates

## Object-Oriented Programming

- Encapsulation
- Abstraction
- Component Composition
- Reusable UI Components

---

# Project Structure

```text
src/
├── components/
│   ├── AppLayout.jsx
│   ├── Modal.jsx
│   └── SetupScreen.jsx
│
├── lib/
│   └── supabase.js
│
├── pages/
│   ├── Dashboard.jsx
│   ├── Products.jsx
│   ├── Inventory.jsx
│   ├── Orders.jsx
│   ├── Clients.jsx
│   ├── Tasks.jsx
│   └── Employees.jsx
│
├── App.jsx
├── main.jsx
└── index.css
```

---

# Running Locally

Clone the repository

```bash
git clone https://github.com/dishaamehra/remedium-ims.git
cd remedium-ims
```

Install dependencies

```bash
npm install
```

Create environment variables

```bash
cp .env.example .env.local
```

Add your Supabase credentials inside `.env.local`

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Run the development server

```bash
npm run dev
```

---

# Deploy on Vercel

1. Fork or clone the repository.
2. Import the project into Vercel.
3. Add the following Environment Variables:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

4. Deploy.

---

# Screens

- Dashboard
- Products
- Inventory
- Orders
- Clients
- Tasks
- Employees

---

# Author

**Dishaa Mehra**

Software Development Intern

GitHub: https://github.com/dishaamehra

Live Demo: https://remedium-ims-dishaa.vercel.app
