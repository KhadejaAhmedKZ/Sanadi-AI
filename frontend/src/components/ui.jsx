// Small reusable presentational components.

export function StatCard({ icon, value, label, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={accent ? { background: accent + "22" } : undefined}>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const AGENT_META = {
  orchestrator: { icon: "🧠", label: "Orchestrator", color: "#0891b2" },
  clinical: { icon: "👨‍⚕️", label: "Clinical", color: "#0ea5e9" },
  operations: { icon: "📅", label: "Operations", color: "#6366f1" },
  engagement: { icon: "💬", label: "Engagement", color: "#10b981" },
  analytics: { icon: "📊", label: "Analytics", color: "#f59e0b" },
  accessibility: { icon: "♿", label: "Accessibility", color: "#8b5cf6" },
  rehabilitation: { icon: "🥽", label: "Rehab", color: "#14b8a6" },
  safety: { icon: "🛡️", label: "Safety", color: "#ef4444" },
};

export function AgentBadge({ name }) {
  const meta = AGENT_META[name] || { icon: "🤖", label: name, color: "#64748b" };
  return (
    <span
      className="badge"
      style={{ background: meta.color + "18", color: meta.color }}
      title={`${meta.label} agent`}
    >
      {meta.icon} {meta.label}
    </span>
  );
}

export function Loader({ label = "Loading…" }) {
  return (
    <div className="center muted" style={{ padding: 40 }}>
      <span className="spin" style={{ fontSize: "1.6rem" }}>⏳</span>
      <div className="mt">{label}</div>
    </div>
  );
}

export function EmptyState({ icon = "📭", title, hint }) {
  return (
    <div className="center muted" style={{ padding: 34 }}>
      <div style={{ fontSize: "2.4rem" }}>{icon}</div>
      <div style={{ fontWeight: 700, marginTop: 8, color: "var(--text)" }}>{title}</div>
      {hint && <div className="mt" style={{ fontSize: ".9rem" }}>{hint}</div>}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div
      className="card"
      style={{ background: "#fee2e2", borderColor: "#fecaca", color: "#991b1b", padding: 14 }}
    >
      ⚠️ {message}
    </div>
  );
}
