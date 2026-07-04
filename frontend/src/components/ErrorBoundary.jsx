import { Component } from "react";

// App-wide safety net: if any page throws during render, show a recoverable
// error card instead of a blank white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Page crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid" style={{ gap: 16, maxWidth: 560, margin: "40px auto", padding: 20 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>⚠️ Something went wrong on this page</h2>
            <p className="muted">
              The rest of the app is fine — this page hit an unexpected error.
            </p>
            <p className="muted" style={{ fontSize: ".8rem", fontFamily: "var(--font-mono, monospace)" }}>
              {String(this.state.error?.message || this.state.error)}
            </p>
            <div className="row" style={{ gap: 10, marginTop: 8 }}>
              <button className="btn" onClick={() => { this.setState({ error: null }); window.history.back(); }}>
                ← Go back
              </button>
              <button className="btn ghost" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
