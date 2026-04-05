import { useState, useEffect } from "react";

/**
 * Returns the current window inner width, updated on resize.
 * Used to drive mobile-responsive inline styles.
 */
export function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}
