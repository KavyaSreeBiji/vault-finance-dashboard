import React, { Component } from "react";
import PropTypes from "prop-types";

/**
 * Class-based error boundary that catches render errors in its subtree.
 * Displays a minimal fallback UI instead of crashing the entire page.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f11",
          color: "#f4f4f5",
          fontFamily: "'DM Sans', sans-serif",
          gap: 12,
          padding: 32,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: "#71717a", maxWidth: 420 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 8,
              background: "#d4a853",
              color: "#0f0f11",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};
