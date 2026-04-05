import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useFinanceStore, DARK_COLORS, LIGHT_COLORS } from "../store.js";
import { fmt } from "../utils/formatters.js";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * Canvas line chart showing monthly net balance trend.
 *
 * @param {object}   props
 * @param {object[]} props.data         - Array of monthly data points.
 * @param {string}   props.data[].date  - ISO date string ("YYYY-MM-DD").
 * @param {number}   props.data[].balance - Net balance for that month.
 */
export function TrendChart({ data }) {
  const COLORS = useFinanceStore((s) => s.darkMode ? DARK_COLORS : LIGHT_COLORS);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W * 2;
    canvas.height = H * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, W, H);

    const pad = { t: 20, r: 20, b: 40, l: 60 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const maxVal = Math.max(...data.map((d) => d.balance));
    const minVal = Math.min(...data.map((d) => d.balance));
    const range  = maxVal - minVal || 1;

    const xScale = (i) => pad.l + (i / (data.length - 1)) * chartW;
    const yScale = (v) => pad.t + chartH - ((v - minVal) / range) * chartH;

    // Grid lines
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 4; i++) {
      const v = minVal + (range / 4) * i;
      const y = yScale(v);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
      ctx.fillStyle   = COLORS.muted;
      ctx.font        = "11px 'DM Mono', monospace";
      ctx.textAlign   = "right";
      ctx.fillText(fmt(v), pad.l - 8, y + 4);
    }

    // X-axis labels
    ctx.setLineDash([]);
    data.forEach((d, i) => {
      ctx.fillStyle = COLORS.muted;
      ctx.font      = "11px 'DM Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(MONTH_LABELS[new Date(d.date).getMonth()], xScale(i), H - pad.b + 16);
    });

    // Fill gradient below line
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, "rgba(212,168,83,0.25)");
    grad.addColorStop(1, "rgba(212,168,83,0)");
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i), y = yScale(d.balance);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(xScale(data.length - 1), H - pad.b);
    ctx.lineTo(xScale(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i), y = yScale(d.balance);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = "round";
    ctx.stroke();

    // Data-point dots
    data.forEach((d, i) => {
      ctx.beginPath();
      ctx.arc(xScale(i), yScale(d.balance), 4, 0, Math.PI * 2);
      ctx.fillStyle   = COLORS.accent;
      ctx.fill();
      ctx.strokeStyle = COLORS.bg;
      ctx.lineWidth   = 2;
      ctx.stroke();
    });
  }, [data, COLORS]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Monthly balance trend chart"
      role="img"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

TrendChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date:    PropTypes.string.isRequired,
      balance: PropTypes.number.isRequired,
    })
  ).isRequired,
};
