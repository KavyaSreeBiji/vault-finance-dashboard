import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const CATEGORIES = ["Food", "Transport", "Housing", "Entertainment", "Health", "Shopping", "Utilities", "Income", "Investment"];

export const DARK_COLORS = {
  income: "#22c55e",
  expense: "#f43f5e",
  transfer: "#a78bfa",
  gold: "#f59e0b",
  goldLight: "#fef3c7",
  bg: "#0f0f11",
  card: "#18181d",
  cardBorder: "#2a2a35",
  text: "#f4f4f5",
  muted: "#71717a",
  accent: "#d4a853",
};

export const LIGHT_COLORS = {
  income: "#16a34a",
  expense: "#e11d48",
  transfer: "#8b5cf6",
  gold: "#d97706",
  goldLight: "#fef3c7",
  bg: "#f8fafc",
  card: "#ffffff",
  cardBorder: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#b48c40",
};

export const INITIAL_TXN = [
  { id: 1, date: "2026-04-01", desc: "Monthly Salary", amount: 85000, category: "Income", type: "income" },
  { id: 2, date: "2026-03-02", desc: "Rent Payment", amount: -22000, category: "Housing", type: "expense" },
  { id: 3, date: "2026-03-03", desc: "Swiggy Order", amount: -650, category: "Food", type: "expense" },
  { id: 4, date: "2026-03-04", desc: "Uber Ride", amount: -340, category: "Transport", type: "expense" },
  { id: 5, date: "2026-03-05", desc: "Netflix Subscription", amount: -649, category: "Entertainment", type: "expense" },
  { id: 6, date: "2026-03-06", desc: "Mutual Fund SIP", amount: -15000, category: "Investment", type: "expense" },
  { id: 7, date: "2026-03-07", desc: "Electricity Bill", amount: -2100, category: "Utilities", type: "expense" },
  { id: 8, date: "2026-03-08", desc: "Freelance Project", amount: 18000, category: "Income", type: "income" },
  { id: 9, date: "2026-03-10", desc: "Pharmacy", amount: -890, category: "Health", type: "expense" },
  { id: 10, date: "2026-03-11", desc: "Amazon Purchase", amount: -3400, category: "Shopping", type: "expense" },
  { id: 11, date: "2026-03-12", desc: "Zomato", amount: -480, category: "Food", type: "expense" },
  { id: 12, date: "2026-03-14", desc: "Petrol", amount: -1200, category: "Transport", type: "expense" },
  { id: 13, date: "2026-03-15", desc: "Salary Bonus", amount: 12000, category: "Income", type: "income" },
  { id: 14, date: "2026-03-16", desc: "Gym Membership", amount: -1500, category: "Health", type: "expense" },
  { id: 15, date: "2026-03-17", desc: "Book Store", amount: -720, category: "Shopping", type: "expense" },
  { id: 16, date: "2026-03-18", desc: "Movie Tickets", amount: -900, category: "Entertainment", type: "expense" },
  { id: 17, date: "2026-03-19", desc: "Water Bill", amount: -450, category: "Utilities", type: "expense" },
  { id: 18, date: "2026-03-20", desc: "Dividend Income", amount: 4200, category: "Investment", type: "income" },
  { id: 19, date: "2026-03-22", desc: "Café Breakfast", amount: -380, category: "Food", type: "expense" },
  { id: 20, date: "2026-03-24", desc: "Clothing Store", amount: -5600, category: "Shopping", type: "expense" },
  { id: 21, date: "2026-03-01", desc: "Monthly Salary", amount: 85000, category: "Income", type: "income" },
  { id: 22, date: "2026-03-02", desc: "Rent Payment", amount: -22000, category: "Housing", type: "expense" },
  { id: 23, date: "2026-03-05", desc: "Food & Dining", amount: -4200, category: "Food", type: "expense" },
  { id: 24, date: "2026-03-10", desc: "Transport", amount: -2800, category: "Transport", type: "expense" },
  { id: 25, date: "2026-03-15", desc: "Shopping", amount: -6500, category: "Shopping", type: "expense" },
  { id: 26, date: "2026-02-01", desc: "Monthly Salary", amount: 85000, category: "Income", type: "income" },
  { id: 27, date: "2026-02-03", desc: "Rent", amount: -22000, category: "Housing", type: "expense" },
  { id: 28, date: "2026-02-08", desc: "Utilities", amount: -3200, category: "Utilities", type: "expense" },
  { id: 29, date: "2026-02-12", desc: "Food", amount: -5100, category: "Food", type: "expense" },
  { id: 30, date: "2026-02-20", desc: "Freelance", amount: 22000, category: "Income", type: "income" },
];

export const useFinanceStore = create(
  persist(
    (set, get) => ({
      darkMode: true,
      toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),

      role: "admin",
      setRole: (role) => set({ role }),

      transactions: INITIAL_TXN,
      isLoading: false,

      activeTab: "dashboard",
      setActiveTab: (tab) => set({ activeTab: tab }),

      filterType: "all",
      setFilterType: (filterType) => set({ filterType }),

      filterCat: "all",
      setFilterCat: (filterCat) => set({ filterCat }),

      filterMonth: "all",
      setFilterMonth: (filterMonth) => set({ filterMonth }),

      groupBy: "none",
      setGroupBy: (groupBy) => set({ groupBy }),

      search: "",
      setSearch: (search) => set({ search }),

      sortField: "date",
      sortDir: "desc",
      toggleSort: (field) => {
        const { sortField, sortDir } = get();
        if (sortField === field) {
          set({ sortDir: sortDir === "asc" ? "desc" : "asc" });
        } else {
          set({ sortField: field, sortDir: "desc" });
        }
      },

      showModal: false,
      setShowModal: (showModal) => set({ showModal }),

      editTxn: null,

      form: { date: "", desc: "", amount: "", category: "Food", type: "expense" },
      setForm: (updater) => set((state) => ({
        form: typeof updater === "function" ? updater(state.form) : { ...state.form, ...updater }
      })),

      openAdd: () => {
        set({
          editTxn: null,
          form: { date: new Date().toISOString().slice(0, 10), desc: "", amount: "", category: "Food", type: "expense" },
          showModal: true
        });
      },

      openEdit: (txn) => {
        set({
          editTxn: txn,
          form: { date: txn.date, desc: txn.desc, amount: Math.abs(txn.amount), category: txn.category, type: txn.type },
          showModal: true
        });
      },

      handleSave: () => {
        const { form, editTxn, transactions } = get();
        if (!form.date || !form.desc || !form.amount) return;

        const amt = form.type === "expense" ? -Math.abs(parseFloat(form.amount)) : Math.abs(parseFloat(form.amount));

        if (editTxn) {
          set({
            transactions: transactions.map((t) => (t.id === editTxn.id ? { ...t, ...form, amount: amt } : t)),
            showModal: false
          });
        } else {
          set({
            transactions: [...transactions, { id: Date.now(), ...form, amount: amt }],
            showModal: false
          });
        }
      },

      handleDelete: (id) => {
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
      },
    }),
    {
      name: 'finance-dashboard-storage',
      partialize: (state) => ({
        activeTab: state.activeTab,
        darkMode: state.darkMode,
        role: state.role,
        transactions: state.transactions
      }),
    }
  )
);
