import React from "react";
import PropTypes from "prop-types";
import { useFinanceStore, DARK_COLORS, LIGHT_COLORS } from "../store.js";
import { fmt } from "../utils/formatters.js";

/**
 * Animated horizontal progress bar representing spending in a single category.
 *
 * @param {object} props
 * @param {string} props.category - Category label.
 * @param {number} props.amount   - Spend amount (should be negative for expenses).
 * @param {number} props.max      - Maximum value (used to compute percentage width).
 * @param {string} props.color    - Bar fill colour (hex).
 */
export function SpendingBar({ category, amount, max, color }) {
  const COLORS = useFinanceStore((s) => s.darkMode ? DARK_COLORS : LIGHT_COLORS);
  const pct = max > 0 ? Math.round((Math.abs(amount) / max) * 100) : 0;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: COLORS.text }}>{category}</span>
        <span style={{ fontSize: 13, color: COLORS.muted }}>{fmt(amount)}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${category} spending: ${pct}%`}
        style={{ height: 5, background: COLORS.cardBorder, borderRadius: 3, overflow: "hidden" }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

SpendingBar.propTypes = {
  category: PropTypes.string.isRequired,
  amount:   PropTypes.number.isRequired,
  max:      PropTypes.number.isRequired,
  color:    PropTypes.string.isRequired,
};
