/**
 * @file main.jsx
 * @description Application entry point.
 * Wraps the root <App /> component in:
 *  - React.StrictMode — highlights potential issues during development
 *  - ErrorBoundary    — catches render-time errors and shows a friendly fallback
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./index.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
