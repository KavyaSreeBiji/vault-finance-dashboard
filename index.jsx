/**
 * @file index.jsx
 * @description Main application component for Vault Finance Dashboard.
 *
 * Architecture:
 *  - SpendingBar   — animated category progress bar
 *  - TrendChart    — canvas-based monthly balance line chart
 *  - DonutChart    — canvas-based category spending donut
 *  - ErrorBoundary — catches render errors and shows fallback UI
 *  - App           — root component with full layout, tabs, modal
 *
 * State is managed globally via Zustand (see store.js).
 * All derived data uses useMemo to prevent unnecessary recalculation.
 */

import React, { useState, useEffect, useRef, useMemo, Component } from "react";
import PropTypes from "prop-types";
import { useFinanceStore, CATEGORIES, DARK_COLORS, LIGHT_COLORS } from "./store.js";

import { ICONS } from "./components/icons.jsx";
import { fmt, fmtFull } from "./utils/formatters.js";
import { useWindowWidth } from "./hooks/useWindowWidth.js";
import { SpendingBar } from "./components/SpendingBar.jsx";
import { TrendChart } from "./components/TrendChart.jsx";
import { DonutChart } from "./components/DonutChart.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Palette for donut chart segments and spending bars (cycles if > 8 categories). */
const DONUT_COLORS = ["#d4a853","#f43f5e","#a78bfa","#22c55e","#38bdf8","#fb923c","#e879f9","#4ade80"];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

/**
 * Root application component.
 *
 * Responsibilities:
 *  - Layout: sidebar, mobile tab bar, main content area
 *  - Tab routing: dashboard / transactions / insights
 *  - Add / Edit transaction modal
 *  - Dark/light mode toggle
 *  - RBAC enforcement (admin vs viewer)
 */
export default function App() {
  const {
    role, setRole,
    transactions, isLoading,
    filterMonth, setFilterMonth,
    groupBy, setGroupBy,
    activeTab, setActiveTab,
    filterType, setFilterType,
    filterCat, setFilterCat,
    search, setSearch,
    sortField, sortDir, toggleSort,
    showModal, setShowModal,
    editTxn, form, setForm,
    openAdd, openEdit, handleSave, handleDelete,
  } = useFinanceStore();

  const darkMode      = useFinanceStore((s) => s.darkMode);
  const toggleDarkMode = useFinanceStore((s) => s.toggleDarkMode);
  const COLORS        = darkMode ? DARK_COLORS : LIGHT_COLORS;

  // Responsive layout
  const viewportWidth = useWindowWidth();
  const isMobile = viewportWidth <= 768;

  // Always-current date — refreshes automatically at midnight
  const [today, setToday] = useState(new Date());
  useEffect(() => {
    const msUntilMidnight = () => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    };
    let timer = setTimeout(function tick() {
      setToday(new Date());
      timer = setTimeout(tick, msUntilMidnight());
    }, msUntilMidnight());
    return () => clearTimeout(timer);
  }, []);

  // ── Derived / memoised values ─────────────────────────────────────────────

  /** Total income across all transactions. */
  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0),
    [transactions]
  );

  /** Total absolute expense across all transactions. */
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === "expense").reduce((a, t) => a + Math.abs(t.amount), 0),
    [transactions]
  );

  const balance = totalIncome - totalExpense;

  /** Category breakdown sorted by spend descending. */
  const catBreakdown = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val], i) => ({ cat, val, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  }, [transactions]);

  const topCategory = catBreakdown[0] ?? null;

  /** Monthly income/expense aggregates sorted chronologically. */
  const monthlyData = useMemo(() => {
    const months = {};
    transactions.forEach((t) => {
      const m = t.date.slice(0, 7);
      if (!months[m]) months[m] = { income: 0, expense: 0 };
      if (t.type === "income") months[m].income += t.amount;
      else months[m].expense += Math.abs(t.amount);
    });
    return Object.entries(months)
      .sort()
      .map(([m, v]) => ({
        date:    `${m}-01`,
        balance: v.income - v.expense,
        income:  v.income,
        expense: v.expense,
        label:   m,
      }));
  }, [transactions]);

  /** Filtered + sorted transaction list derived from all active filters. */
  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filterType  !== "all") list = list.filter((t) => t.type === filterType);
    if (filterCat   !== "all") list = list.filter((t) => t.category === filterCat);
    if (filterMonth !== "all") list = list.filter((t) => t.date.startsWith(filterMonth));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === "amount") { va = Math.abs(a.amount); vb = Math.abs(b.amount); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
    return list;
  }, [transactions, filterType, filterCat, search, sortField, sortDir, filterMonth]);

  /** Unique month keys from all transactions, newest first. */
  const uniqueMonths = useMemo(() => {
    const m = new Set(transactions.map((t) => t.date.slice(0, 7)));
    return Array.from(m).sort().reverse();
  }, [transactions]);

  /**
   * Export the currently filtered transactions as CSV or JSON.
   * Uses the Vite dev-server /api/export middleware to ensure the
   * Content-Disposition header sets the correct filename.
   *
   * @param {'csv'|'json'} type
   */
  const exportData = async (type) => {
    let content, filename;
    if (type === "json") {
      content  = JSON.stringify(filtered, null, 2);
      filename = "transactions.json";
    } else {
      const header = "id,date,desc,amount,category,type\n";
      const rows   = filtered
        .map((t) => `${t.id},${t.date},"${t.desc}",${t.amount},${t.category},${t.type}`)
        .join("\n");
      content  = header + rows;
      filename = "transactions.csv";
    }

    try {
      const resp = await fetch("/api/export", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type, content }),
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href          = url;
      a.download      = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    }
  };

  /** AI-style spending observations derived from the transaction dataset. */
  const spendingIntelligence = useMemo(() => {
    const insights    = [];
    const savingsRate = totalIncome
      ? ((totalIncome - totalExpense) / totalIncome) * 100
      : 0;

    // 1. Savings rate health
    if (savingsRate >= 20) {
      insights.push({
        Icon: ICONS.Lightbulb,
        color: DONUT_COLORS[0],
        title: "Savings rate is healthy",
        desc:  `At ${Math.round(savingsRate)}% savings rate, you're above the recommended 20% threshold. Great job!`,
      });
    } else if (savingsRate > 0) {
      insights.push({
        Icon: ICONS.AlertTriangle,
        color: DONUT_COLORS[5],
        title: "Room to save more",
        desc:  `Your savings rate is ${Math.round(savingsRate)}%. Try to optimise expenses to reach the 20% goal.`,
      });
    } else {
      insights.push({
        Icon: ICONS.Siren,
        color: DONUT_COLORS[1],
        title: "Negative Cashflow",
        desc:  "You are spending more than you're earning. Review your recent expenses to find cutting opportunities.",
      });
    }

    // 2. Top expense category
    if (topCategory && topCategory.val > 0) {
      const pct = Math.round((topCategory.val / totalExpense) * 100);
      const iconMap = { Housing: ICONS.Home, Food: ICONS.Coffee, Transport: ICONS.Car, Shopping: ICONS.ShoppingBag };
      insights.push({
        Icon: iconMap[topCategory.cat] || ICONS.BarChart,
        color: topCategory.color,
        title: `${topCategory.cat} is your biggest expense`,
        desc:  `You spent ${fmt(-topCategory.val)} on ${topCategory.cat}, making up ${pct}% of your total expenses.`,
      });
    }

    // 3. Most frequent spending category
    const freqMap = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      freqMap[t.category] = (freqMap[t.category] || 0) + 1;
    });
    const mostFrequent = Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0];
    if (mostFrequent && mostFrequent[1] >= 3) {
      insights.push({
        Icon: ICONS.CreditCard,
        color: DONUT_COLORS[2],
        title: `${mostFrequent[0]} spending is frequent`,
        desc:  `You had ${mostFrequent[1]} separate transactions for ${mostFrequent[0]}. Small, repeated purchases can add up!`,
      });
    }

    // 4. Investment status
    const investedAmount = transactions
      .filter((t) => t.category === "Investment" && t.type === "expense")
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    if (investedAmount > 0) {
      insights.push({
        Icon: ICONS.TrendingUp,
        color: DONUT_COLORS[3],
        title: "You're investing regularly",
        desc:  `You've put ${fmt(-investedAmount)} towards investments. Consistent wealth-building is key!`,
      });
    } else {
      insights.push({
        Icon: ICONS.Plant,
        color: DONUT_COLORS[7],
        title: "Consider starting to invest",
        desc:  "You have no recorded investments. Putting even a small amount to work can grow your wealth over time.",
      });
    }

    return insights.slice(0, 4);
  }, [totalIncome, totalExpense, topCategory, transactions]);

  // ── Derived display values ────────────────────────────────────────────────

  const donutSegments    = catBreakdown.slice(0, 6).map((c) => ({ label: c.cat, value: c.val, color: c.color }));
  const comparisonMonths = monthlyData.slice(-3);

  // ── Style shortcuts ───────────────────────────────────────────────────────

  const th = {
    color:           COLORS.muted,
    fontSize:        12,
    padding:         "8px 12px",
    textAlign:       "left",
    fontWeight:      500,
    letterSpacing:   "0.08em",
    textTransform:   "uppercase",
    borderBottom:    `1px solid ${COLORS.cardBorder}`,
    cursor:          "pointer",
    whiteSpace:      "nowrap",
  };

  const td = {
    padding:      "12px 12px",
    fontSize:     13,
    color:        COLORS.text,
    borderBottom: `1px solid ${COLORS.cardBorder}`,
  };

  const cardStyle = {
    background:   COLORS.card,
    border:       `1px solid ${COLORS.cardBorder}`,
    borderRadius: 16,
    padding:      "20px 24px",
  };

  const btnStyle = (variant = "ghost") => ({
    background:  variant === "primary" ? COLORS.accent : COLORS.card,
    color:       variant === "primary" ? "#0f0f11"     : COLORS.accent,
    border:      variant === "primary" ? "none"        : `1px solid ${COLORS.accent}55`,
    borderRadius: 8,
    padding:     "8px 16px",
    fontSize:    12,
    fontWeight:  600,
    cursor:      "pointer",
    fontFamily:  "'DM Sans', sans-serif",
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@600;700&family=DM+Mono&display=swap"
        rel="stylesheet"
      />

      {/* Dynamic global styles — theme-reactive */}
      <style>{`
        body { margin: 0; padding: 0; overflow-x: hidden; }
        * { box-sizing: border-box; }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        input, select {
          background: ${COLORS.card};
          color: ${COLORS.text};
          border: 1px solid ${COLORS.cardBorder};
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
        }
        input:focus, select:focus { border-color: ${COLORS.accent}; }
        select option { background: ${COLORS.card}; color: ${COLORS.text}; }
        select option:checked { background: ${COLORS.accent}33; color: ${COLORS.accent}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.cardBorder}; border-radius: 4px; }
        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: 1fr 1fr !important; }
          .chart-row    { grid-template-columns: 1fr !important; }
          .insights-row { grid-template-columns: 1fr !important; }
          .sidebar      { display: none !important; }
          .mobile-tabs  { display: flex !important; }
          .main-content { padding: 12px 12px 80px !important; margin-left: 0 !important; }
          .txn-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .txn-table-wrap table { min-width: 520px; }
          .hide-mobile  { display: none !important; }
          .page-header  { flex-wrap: wrap; gap: 10px !important; margin-bottom: 18px !important; }
          .page-header h1 { font-size: 20px !important; }
          .page-header-date { font-size: 11px !important; }
          .header-actions { flex-wrap: wrap; gap: 8px !important; }
          .filter-bar { flex-direction: column !important; gap: 8px !important; }
          .filter-bar input { width: 100% !important; min-width: unset !important; }
          .filter-bar select { width: 100% !important; }
          .filter-bar-row2 { display: flex !important; gap: 8px; flex-wrap: wrap; }
          .export-btns { display: flex !important; gap: 6px; }
          .spending-grid { grid-template-columns: 1fr !important; }
          .spending-bar-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
        }
        @media (max-width: 400px) {
          .summary-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside
          className="sidebar"
          aria-label="Main navigation"
          style={{
            width: 220, background: COLORS.card,
            borderRight: `1px solid ${COLORS.cardBorder}`,
            display: "flex", flexDirection: "column",
            position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100,
          }}
        >
          {/* Brand */}
          <div style={{ padding: "28px 24px 20px" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: COLORS.accent, letterSpacing: "-0.01em" }}>
              Vault
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2, letterSpacing: "0.1em" }}>
              FINANCE TRACKER
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: "0 12px" }} aria-label="Tab navigation">
            {[["dashboard","Overview"],["transactions","Transactions"],["insights","Insights"]].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? "page" : undefined}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 4,
                  borderRadius: 10, border: "none", cursor: "pointer",
                  background: activeTab === tab ? "rgba(212,168,83,0.1)" : "transparent",
                  color:      activeTab === tab ? COLORS.accent : COLORS.muted,
                  fontSize: 14, fontWeight: activeTab === tab ? 600 : 400,
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Role selector */}
          <div style={{ padding: "16px 20px 24px" }}>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8, letterSpacing: "0.08em" }}>ROLE</div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="User role"
              style={{ width: "100%", fontSize: 13 }}
            >
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            {role === "admin"  && <div style={{ fontSize: 10, color: COLORS.accent, marginTop: 6 }}>Full access enabled</div>}
            {role === "viewer" && <div style={{ fontSize: 10, color: COLORS.muted,  marginTop: 6 }}>Read-only mode</div>}
          </div>
        </aside>

        {/* ── MOBILE BOTTOM TAB BAR ────────────────────────────────────────── */}
        <nav
          className="mobile-tabs"
          aria-label="Mobile tab navigation"
          style={{
            display: "none", position: "fixed", bottom: 0, left: 0, right: 0,
            background: COLORS.card, borderTop: `1px solid ${COLORS.cardBorder}`,
            zIndex: 100, justifyContent: "space-around", padding: "8px 0 12px",
          }}
        >
          {[["dashboard","Overview"],["transactions","Transactions"],["insights","Insights"]].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              style={{
                background: "none", border: "none",
                color: activeTab === tab ? COLORS.accent : COLORS.muted,
                fontSize: 12, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main
          className="main-content"
          aria-label="Dashboard content"
          style={{
            flex: 1,
            marginLeft: isMobile ? 0 : 220,
            padding: isMobile ? "12px 12px" : "32px 36px",
            paddingBottom: isMobile ? 80 : 60,
            minWidth: 0,
            maxWidth: "100vw",
            overflowX: "hidden",
          }}
        >

          {/* Page header */}
          <div className="page-header" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            flexWrap: isMobile ? "wrap" : "nowrap",
            gap: isMobile ? 10 : 0,
            marginBottom: isMobile ? 16 : 32,
          }}>
            <div>
              <h1 className="page-header-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                {activeTab === "dashboard"    && "Financial Overview"}
                {activeTab === "transactions" && "Transactions"}
                {activeTab === "insights"     && "Insights"}
              </h1>
              <div className="page-header-date" style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>
                {today.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
            <div className="header-actions" style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
              {/* Role selector — mobile only (desktop shows it in sidebar) */}
              {isMobile && (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  aria-label="User role"
                  style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${role === "admin" ? COLORS.accent : COLORS.cardBorder}`, color: role === "admin" ? COLORS.accent : COLORS.muted, fontWeight: 600 }}
                >
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              )}
              <button
                onClick={toggleDarkMode}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                style={{ background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
              >
                {darkMode
                  ? <><ICONS.Sun size={15} style={{ flexShrink: 0 }} /><span>Light</span></>
                  : <><ICONS.Moon size={15} style={{ flexShrink: 0 }} /><span>Dark</span></>
                }
              </button>
              {role === "admin" && activeTab === "transactions" && (
                <button
                  onClick={openAdd}
                  aria-label="Add new transaction"
                  style={{ background: COLORS.accent, color: "#ffffff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}
                >
                  + Add
                </button>
              )}
            </div>
          </div>

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div className="fade-in">
              {/* Summary cards */}
              <div className="summary-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Total Balance",   value: balance,       color: balance >= 0 ? COLORS.income : COLORS.expense, sub: "Current standing" },
                  { label: "Total Income",    value: totalIncome,   color: COLORS.income,  sub: "All time" },
                  { label: "Total Expenses",  value: totalExpense,  color: COLORS.expense, sub: "All time" },
                ].map((card) => (
                  <div key={card.label} className="card-hover" style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: card.color, opacity: 0.07, borderRadius: "0 16px 0 100%" }} />
                    <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{card.label}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: card.color, letterSpacing: "-0.02em" }}>{fmt(card.value)}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="chart-row" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 16, marginBottom: 24 }}>
                <div className="card-hover" style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Balance Trend</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 16 }}>Monthly net balance</div>
                  <div style={{ height: 200 }}>
                    {monthlyData.length > 0
                      ? <TrendChart data={monthlyData} />
                      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted }}>No trend data available</div>
                    }
                  </div>
                </div>
                <div className="card-hover" style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Spending Breakdown</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>By category</div>
                  {donutSegments.length > 0 ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <DonutChart segments={donutSegments} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                        {donutSegments.map((s) => (
                          <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: COLORS.muted }}>{s.label}</span>
                            </div>
                            <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: COLORS.text }}>
                              {fmt(-Math.abs(s.value))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: COLORS.muted, fontSize: 13, padding: "32px 0", textAlign: "center" }}>No expense data yet</div>
                  )}
                </div>
              </div>

              {/* Top spending categories */}
              <div className="card-hover" style={cardStyle}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Top Spending Categories</div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 20 }}>Your biggest expense areas</div>
                {catBreakdown.length > 0 ? (
                  <div className="spending-bar-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 0 : "0 48px" }}>
                    {catBreakdown.slice(0, 8).map((c, i) => (
                      <SpendingBar key={c.cat} category={c.cat} amount={-c.val} max={catBreakdown[0].val} color={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </div>
                ) : (
                  <div style={{ color: COLORS.muted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>Add expense transactions to see spending breakdown</div>
                )}
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS TAB ─────────────────────────────────────────── */}
          {activeTab === "transactions" && (
            <div className="fade-in">
              {/* Filter bar */}
              <div className="filter-bar" style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 8 : 10,
                marginBottom: 16,
                flexWrap: isMobile ? "nowrap" : "wrap",
                alignItems: isMobile ? "stretch" : "center",
              }}>
                <input
                  placeholder="Search transactions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search transactions"
                  style={{ flex: 1, minWidth: 180 }}
                />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Filter by type">
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} aria-label="Filter by category">
                  <option value="all">All Categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="filter-bar-row2" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
                  <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter by month" style={{ flex: 1, minWidth: 120 }}>
                    <option value="all">All Months</option>
                    {uniqueMonths.map((m) => (
                      <option key={m} value={m}>
                        {new Date(`${m}-01`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.text, flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      id="grp"
                      checked={groupBy === "category"}
                      onChange={(e) => setGroupBy(e.target.checked ? "category" : "none")}
                      aria-label="Group by category"
                    />
                    <label htmlFor="grp" style={{ cursor: "pointer" }}>Group</label>
                  </div>
                  <div className="export-btns" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => exportData("csv")}  aria-label="Export as CSV"  style={btnStyle()}>⬇ CSV</button>
                    <button onClick={() => exportData("json")} aria-label="Export as JSON" style={btnStyle()}>⬇ JSON</button>
                  </div>
                </div>
              </div>

              {/* Result count */}
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>
                {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} found
              </div>

              {/* Transaction table */}
              <div className="card-hover" style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                <div className="txn-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Transactions table">
                    <thead>
                      <tr>
                        {[["date","Date"],["desc","Description"],["category","Category"],["type","Type"],["amount","Amount"]].map(([f, l]) => (
                          <th
                            key={f}
                            style={th}
                            onClick={() => toggleSort(f)}
                            aria-sort={sortField === f ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                          >
                            {l} {sortField === f ? (sortDir === "asc" ? "↑" : "↓") : ""}
                          </th>
                        ))}
                        {role === "admin" && <th style={th}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={role === "admin" ? 6 : 5}
                            style={{ ...td, textAlign: "center", color: COLORS.muted, padding: "48px 0" }}
                          >
                            No transactions match your filters
                          </td>
                        </tr>
                      ) : groupBy === "category" ? (
                        Object.entries(
                          filtered.reduce((acc, t) => {
                            if (!acc[t.category]) acc[t.category] = [];
                            acc[t.category].push(t);
                            return acc;
                          }, {})
                        ).map(([cat, txns]) => (
                          <React.Fragment key={cat}>
                            <tr style={{ background: "rgba(212,168,83,0.08)" }}>
                              <td colSpan={role === "admin" ? 6 : 5} style={{ padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${COLORS.accent}44` }}>
                                <span style={{ fontWeight: 600, color: COLORS.accent, letterSpacing: "0.02em" }}>{cat}</span>
                                <span style={{ fontSize: 11, color: COLORS.muted, marginLeft: 8 }}>
                                  — {txns.length} items (Total: {fmtFull(txns.reduce((s, t) => s + t.amount, 0))})
                                </span>
                              </td>
                            </tr>
                            {txns.map((t) => (
                              <tr
                                key={t.id}
                                style={{ transition: "background 0.1s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,168,83,0.03)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <td style={td}>{new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                                <td style={td}>{t.desc}</td>
                                <td style={td}>
                                  <span style={{ background: "rgba(212,168,83,0.1)", color: COLORS.accent, borderRadius: 6, padding: "3px 8px", fontSize: 11 }}>
                                    {t.category}
                                  </span>
                                </td>
                                <td style={td}>
                                  <span style={{ color: t.type === "income" ? COLORS.income : COLORS.expense, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {t.type}
                                  </span>
                                </td>
                                <td style={{ ...td, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: t.amount >= 0 ? COLORS.income : COLORS.expense }}>
                                  {fmtFull(t.amount)}
                                </td>
                                {role === "admin" && (
                                  <td style={td}>
                                    <button onClick={() => openEdit(t)} aria-label={`Edit ${t.desc}`} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 12, marginRight: 8 }}>Edit</button>
                                    <button onClick={() => handleDelete(t.id)} aria-label={`Delete ${t.desc}`} style={{ background: "none", border: "none", color: "#f43f5e", cursor: "pointer", fontSize: 12 }}>Del</button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        filtered.map((t) => (
                          <tr
                            key={t.id}
                            style={{ transition: "background 0.1s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,168,83,0.03)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <td style={td}>{new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                            <td style={td}>{t.desc}</td>
                            <td style={td}>
                              <span style={{ background: "rgba(212,168,83,0.1)", color: COLORS.accent, borderRadius: 6, padding: "3px 8px", fontSize: 11 }}>
                                {t.category}
                              </span>
                            </td>
                            <td style={td}>
                              <span style={{ color: t.type === "income" ? COLORS.income : COLORS.expense, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                {t.type}
                              </span>
                            </td>
                            <td style={{ ...td, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: t.amount >= 0 ? COLORS.income : COLORS.expense }}>
                              {fmtFull(t.amount)}
                            </td>
                            {role === "admin" && (
                              <td style={td}>
                                <button onClick={() => openEdit(t)} aria-label={`Edit ${t.desc}`} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 12, marginRight: 8 }}>Edit</button>
                                <button onClick={() => handleDelete(t.id)} aria-label={`Delete ${t.desc}`} style={{ background: "none", border: "none", color: "#f43f5e", cursor: "pointer", fontSize: 12 }}>Del</button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── INSIGHTS TAB ─────────────────────────────────────────────── */}
          {activeTab === "insights" && (
            <div className="fade-in">
              {/* KPI cards */}
              <div className="insights-row" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div className="card-hover" style={{ ...cardStyle, borderLeft: `3px solid ${COLORS.accent}` }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.08em", marginBottom: 6 }}>TOP EXPENSE CATEGORY</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: COLORS.accent }}>{topCategory?.cat || "—"}</div>
                  <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>{fmt(-(topCategory?.val || 0))} spent</div>
                </div>
                <div className="card-hover" style={{ ...cardStyle, borderLeft: `3px solid ${COLORS.income}` }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.08em", marginBottom: 6 }}>SAVINGS RATE</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: COLORS.income }}>
                    {totalIncome ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Of total income saved</div>
                </div>
                <div className="card-hover" style={{ ...cardStyle, borderLeft: `3px solid ${COLORS.expense}` }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.08em", marginBottom: 6 }}>AVG TRANSACTION</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: COLORS.text }}>
                    {fmt(transactions.reduce((a, t) => a + Math.abs(t.amount), 0) / (transactions.length || 1))}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Across {transactions.length} entries</div>
                </div>
              </div>

              {/* Monthly comparison + Spending Intelligence */}
              <div className="chart-row" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div className="card-hover" style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Monthly Comparison</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 20 }}>Income vs Expenses</div>
                  {comparisonMonths.length > 0 ? comparisonMonths.map((m) => (
                    <div key={m.label} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>
                        {new Date(m.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                      </div>
                      {[
                        { label: "Income",   val: m.income,  total: m.income + m.expense, color: COLORS.income  },
                        { label: "Expenses", val: m.expense, total: m.income + m.expense, color: COLORS.expense },
                      ].map((row) => (
                        <div key={row.label} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: row.color }}>{row.label}</span>
                            <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(row.val)}</span>
                          </div>
                          <div style={{ height: 6, background: COLORS.cardBorder, borderRadius: 3 }}>
                            <div style={{ height: "100%", width: row.total > 0 ? `${Math.round((row.val / row.total) * 100)}%` : "0%", background: row.color, borderRadius: 3 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )) : (
                    <div style={{ color: COLORS.muted }}>No monthly data available.</div>
                  )}
                </div>

                <div className="card-hover" style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Spending Intelligence</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 20 }}>Observations from your data</div>
                  {spendingIntelligence.length === 0 ? (
                    <div style={{ color: COLORS.muted }}>Add transactions to unlock spending insights.</div>
                  ) : spendingIntelligence.map((obs, i) => {
                    const { Icon } = obs;
                    return (
                      <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: i < 3 ? `1px solid ${COLORS.cardBorder}` : "none", alignItems: "flex-start" }}>
                        <div style={{ padding: 8, borderRadius: 10, background: `${obs.color}15`, color: obs.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{obs.title}</div>
                          <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>{obs.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category deep dive */}
              <div className="card-hover" style={cardStyle}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Category Deep Dive</div>
                {catBreakdown.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                    {catBreakdown.map((c) => (
                      <div key={c.cat} style={{ background: COLORS.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${COLORS.cardBorder}` }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, marginBottom: 8 }} />
                        <div style={{ fontSize: 12, color: COLORS.muted }}>{c.cat}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 600, marginTop: 2 }}>{fmt(-c.val)}</div>
                        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                          {totalExpense > 0 ? Math.round((c.val / totalExpense) * 100) : 0}% of expenses
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: COLORS.muted, padding: "20px 0", textAlign: "center" }}>No expense categories recorded.</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── ADD / EDIT MODAL ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editTxn ? "Edit transaction" : "Add new transaction"}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              {editTxn ? "Edit Transaction" : "New Transaction"}
            </div>
            {[
              { label: "Date",         key: "date",   type: "date"   },
              { label: "Description",  key: "desc",   type: "text",   placeholder: "What was this for?" },
              { label: "Amount (₹)",   key: "amount", type: "number", placeholder: "0" },
            ].map((f) => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: COLORS.muted, display: "block", marginBottom: 5, letterSpacing: "0.06em" }}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%" }}
                  aria-label={f.label}
                />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, display: "block", marginBottom: 5 }}>Category</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} style={{ width: "100%" }} aria-label="Category">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: COLORS.muted, display: "block", marginBottom: 5 }}>Type</label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} style={{ width: "100%" }} aria-label="Transaction type">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSave}
                aria-label={editTxn ? "Save changes" : "Add transaction"}
                style={{ flex: 1, background: COLORS.accent, color: "#0f0f11", border: "none", borderRadius: 10, padding: "11px 0", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
              >
                {editTxn ? "Save Changes" : "Add Transaction"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Cancel"
                style={{ padding: "11px 20px", background: "transparent", border: `1px solid ${COLORS.cardBorder}`, borderRadius: 10, color: COLORS.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}