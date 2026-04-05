# Vault — Finance Dashboard UI

> A modern, feature-rich personal finance tracker built with **React 19**, **Zustand**, and **Vite**. Track income and expenses, visualise spending trends, export data, and switch between admin and read-only roles — all in a polished dark/light mode UI.

**Live Demo:** [vault-finance-dashboard-lilac.vercel.app](https://vault-finance-dashboard-lilac.vercel.app/)

---


## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later

### Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

### Other scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview the production build locally |

---

## Project Structure

```
FinanceDashboardUI/
├── index.html          # HTML entry point
├── main.jsx            # React DOM root mount
├── index.jsx           # All UI components & App root
├── store.js            # Zustand global state store
├── vite.config.js      # Vite config + export API middleware
└── package.json
```

---

## Features Overview

### 1. Dashboard (Overview Tab)
- **Summary Cards** — Total Balance, Total Income, Total Expenses with colour-coded indicators
- **Balance Trend Chart** — Canvas-drawn monthly net-balance line chart with gradient fill
- **Spending Breakdown** — Donut chart segmented by expense category
- **Top Spending Categories** — Animated progress bars ranked by spend

### 2. Transactions Tab
- **Search** — Real-time fuzzy search across description and category
- **Filters** — Filter by Type (income/expense), Category, and Month
- **Group By Category** — Toggle to group transactions by their category
- **Sortable columns** — Click any column header to sort ascending/descending
- **Add / Edit / Delete** — Full CRUD (Admin role only)
- **Export** — Download current filtered view as `.csv` or `.json` via server endpoint

### 3. Insights Tab
- **Key Metrics** — Top expense category, savings rate %, average transaction value
- **Monthly Comparison** — Income vs expense bar comparison for the last 3 months
- **Spending Intelligence** — AI-style observations: savings health, frequent categories, investment status
- **Category Deep Dive** — Grid breakdown of every expense category with % of total

### 4. Role-Based Access Control (RBAC)
| Feature | Admin | Viewer |
|---|---|---|
| View dashboard, transactions, insights | ✅ | ✅ |
| Add / Edit / Delete transactions | ✅ | ❌ |
| Export CSV / JSON | ✅ | ✅ |
| Switch role | ✅ | ✅ |

Switch roles using the **ROLE** selector in the sidebar. Changes take effect instantly across the entire UI.

### 5. Dark / Light Mode
One-click toggle in the top-right corner. Theme preference is persisted across browser sessions via `localStorage`.

---

## Approach & Architecture

### State Management — Zustand
All application state lives in a single Zustand store (`store.js`) using the `persist` middleware to sync selected state to `localStorage`.

**State shape (key slices):**
```
darkMode          boolean       — current theme
role              'admin'|'viewer'
transactions      Transaction[] — full dataset
activeTab         string        — current view
filterType/Cat/Month            — transaction filter state
groupBy           string        — 'none' | 'category'
search            string        — live search query
sortField/Dir                   — table sort state
showModal         boolean       — add/edit modal visibility
form              object        — controlled form fields
```

**Persisted fields:** `darkMode`, `role`, `activeTab`, `transactions`

### Component Architecture
All components are co-located in `index.jsx` for simplicity (suitable for this scale):

| Component | Responsibility |
|---|---|
| `App` | Root component — layout, tab routing, modal |
| `TrendChart` | Canvas-based monthly balance line chart |
| `DonutChart` | Canvas-based category spending donut |
| `SpendingBar` | Animated category spend progress bar |

### Data Flow
```
store.js (Zustand) ──► App (reads/writes via hooks)
                    ──► Sub-components (read via selective subscriptions)
```

All derived data (filtered list, category breakdown, monthly totals, insights) is computed with `useMemo` to avoid unnecessary recalculations.

### Export Architecture
The export flow uses a Vite dev-server middleware (`/api/export`) to bypass browser `data:` URI restrictions:
```
User clicks ⬇ CSV
  → JS POSTs { type, content } to /api/export
  → Vite middleware responds with Content-Disposition: attachment; filename="transactions.csv"
  → Browser downloads the file with correct name & extension
```

---

## Design Decisions

| Decision | Rationale |
|---|---|
| **Inline styles** | Keeps component and style co-located; avoids external CSS tooling overhead |
| **Dynamic `<style>` block** | Allows CSS (incl. `select option`) to adapt to dark/light theme without CSS variables |
| **Canvas charts** | Zero dependency, full control over rendering and theming |
| **Zustand over Redux** | Minimal boilerplate, built-in `persist` middleware, selector subscriptions |
| **DM Sans + Playfair Display** | Pairs modern sans-serif body text with elegant serif headings |

---

## Responsiveness

| Breakpoint | Behaviour |
|---|---|
| **≥ 769px** | Sidebar visible, 3-column summary grid, side-by-side charts |
| **≤ 768px** | Sidebar hidden, bottom tab bar shown, all grids collapse to 1 column, table scrolls horizontally |

---

## Technical Quality

- **React 19** with functional components and hooks only
- **useMemo** for all derived/expensive computations
- **Zustand** store actions encapsulate all mutation logic (no direct state mutation in components)
- **Error boundaries** — `ErrorBoundary` component wraps the app to catch and display render errors gracefully
- **Accessibility** — `aria-label` attributes on interactive elements, semantic `<aside>`, `<nav>`, `<main>`, `<table>` HTML
- **Edge cases handled:**
  - Empty transaction list → "No transactions found" row
  - No expense data → donut chart hidden, spending bars hidden
  - Zero income → savings rate shows 0% safely
  - No monthly data → chart shows placeholder message
  - No insights data → placeholder message shown

---

## Sample Data

The store ships with **30 pre-loaded transactions** across Feb–Apr 2026 covering categories: Income, Housing, Food, Transport, Shopping, Entertainment, Health, Utilities, and Investment.

> **Note:** Zustand `persist` saves transactions to `localStorage`. To reset to the original sample data: open DevTools → Application → Local Storage → `localhost:5173` → delete the key `finance-dashboard-storage`.

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | UI framework |
| `react-dom` | ^19.2.4 | DOM renderer |
| `zustand` | ^5.0.12 | State management |
| `vite` | ^8.0.3 | Build tool & dev server |
| `@vitejs/plugin-react` | ^6.0.1 | React JSX/HMR support |

---

## Author

Kavya Sree B  
Finance Dashboard UI — React + Vite + Zustand
