import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useFinanceStore, DARK_COLORS, LIGHT_COLORS } from "../store.js";
import { fmt } from "../utils/formatters.js";

/**
 * Canvas donut chart for category spending breakdown.
 *
 * @param {object}   props
 * @param {object[]} props.segments         - Array of segments.
 * @param {string}   props.segments[].label - Category name.
 * @param {number}   props.segments[].value - Spend value (positive).
 * @param {string}   props.segments[].color - Hex colour.
 */
export function DonutChart({ segments }) {
  const COLORS = useFinanceStore((s) => s.darkMode ? DARK_COLORS : LIGHT_COLORS);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !segments.length) return;

    const S   = 200;
    canvas.width  = S * 2;
    canvas.height = S * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);

    const cx = S / 2, cy = S / 2, r = 70, inner = 48;
    const total = segments.reduce((a, s) => a + Math.abs(s.value), 0);
    let angle = -Math.PI / 2;

    segments.forEach((seg) => {
      const slice = (Math.abs(seg.value) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      angle += slice;
    });

    // Inner circle (hole)
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.card;
    ctx.fill();

    // Centre label
    ctx.fillStyle  = COLORS.text;
    ctx.font       = "bold 14px 'Playfair Display', serif";
    ctx.textAlign  = "center";
    ctx.fillText(fmt(-total), cx, cy + 5);
  }, [segments, COLORS]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Spending breakdown donut chart"
      role="img"
      style={{ width: 200, height: 200 }}
    />
  );
}

DonutChart.propTypes = {
  segments: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      color: PropTypes.string.isRequired,
    })
  ).isRequired,
};
