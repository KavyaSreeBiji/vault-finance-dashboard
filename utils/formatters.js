/**
 * Compact Indian-locale currency formatter (absolute value).
 * @param {number} n - Amount in INR.
 * @returns {string} e.g. "₹1.2L", "₹42K", "₹650"
 */
export const fmt = (n) => {
  const abs = Math.abs(n);
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `₹${(abs / 1000).toFixed(1)}K`;
  return `₹${abs.toLocaleString("en-IN")}`;
};

/**
 * Full Indian-locale currency formatter (absolute value, no abbreviation).
 * @param {number} n - Amount in INR.
 * @returns {string} e.g. "₹85,000"
 */
export const fmtFull = (n) => `₹${Math.abs(n).toLocaleString("en-IN")}`;
