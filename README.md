# Remedium IMS — Inventory & Order Management System

A full-stack Inventory & Order Management System built for **Remedium Enterprises Pvt. Ltd.** during my Software Development Internship.

**Live Demo:** [remedium-ims-dishaa.vercel.app](https://remedium-ims-dishaa.vercel.app/)

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Supabase
- **Database:** PostgreSQL
- **Charts:** Recharts
- **Deployment:** Vercel

## Features

| Module | Description |
|---|---|
| Dashboard | Business insights, live statistics, low-stock alerts, and order analytics |
| Products | Create, update, delete, and manage products |
| Inventory | Stock adjustments and audit logs |
| Orders | Order management with multiple order items |
| Clients | Customer and company management |
| Tasks | Kanban board for employee task tracking |
| Employees | Employee directory and task assignments |

## Database Design

The database uses a relational schema to manage products, inventory, orders, customers, employees, and tasks.

**Core tables:** `categories`, `products`, `orders`, `order_items`, `clients`, `employees`, `tasks`, and `stock_logs`.

### Key Database Concepts

- Third Normal Form (3NF) and relational database design
- Primary and foreign key constraints
- CHECK and unique constraints
- Generated columns and indexing
- Transactions and atomic operations
- Inventory audit logging and concurrent updates

## Computer Science Concepts

- **DBMS:** Normalization, relational modelling, constraints, and indexing
- **Computer Networks:** REST APIs, HTTP methods, client–server architecture, HTTPS, and JSON data exchange
- **Operating Systems:** ACID transactions, atomic operations, and concurrent updates
- **Software Design:** Encapsulation, abstraction, and reusable UI components

## Project Structure

```text
src/
├── components/
│   ├── AppLayout.jsx
│   ├── Modal.jsx
│   └── SetupScreen.jsx
├── lib/
│   └── supabase.js
├── pages/
│   ├── Dashboard.jsx
│   ├── Products.jsx
│   ├── Inventory.jsx
│   ├── Orders.jsx
│   ├── Clients.jsx
│   ├── Tasks.jsx
│   └── Employees.jsx
├── App.jsx
├── main.jsx
└── index.css
```

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/dishaamehra/remedium-ims.git
cd remedium-ims
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file using `.env.example` as a reference:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Replace the placeholders with your Supabase project URL and public client key.

### 4. Start the development server

```bash
npm run dev
```

## Deployment

The application is deployed on Vercel.

To deploy your own instance:

1. Import the repository into Vercel.
2. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project environment variables.
3. Deploy the application.

## Author

**Dishaa Mehra**  
Software Development Intern

- **GitHub:** [dishaamehra](https://github.com/dishaamehra)
- **Live Application:** [Remedium IMS](https://remedium-ims-dishaa.vercel.app/)
