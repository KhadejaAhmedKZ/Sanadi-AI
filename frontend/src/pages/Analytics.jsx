import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { StatCard, Loader, ErrorNote, EmptyState } from "../components/ui.jsx";

export default function Analytics() {
  const { user } = useAuth();
  const patientId = user.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.patientAnalytics(patientId).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <Loader label="Crunching your health data…" />;
  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  const trend = data.pain_trend || [];
  const maxPain = 10;

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>Analytics</h1>
        <p>Insights from the Analytics agent — grounded in your real data.</p>
      </div>

      <div className="grid cols-4">
        <StatCard icon="✅" value={`${Math.round(data.adherence_rate * 100)}%`} label="Medication adherence" accent="#10b981" />
        <StatCard icon="💊" value={data.active_medications} label="Active medications" accent="#0ea5e9" />
        <StatCard icon="🩺" value={data.recent_symptom_count} label="Symptom logs" accent="#f59e0b" />
        <StatCard icon="📈" value={data.avg_recent_pain ?? "—"} label="Avg recent pain" accent="#ef4444" />
      </div>

      <div className="card">
        <h3 className="card-title">Pain trend</h3>
        <p className="card-sub">Recent recorded pain levels (0–10)</p>
        {trend.length === 0 ? (
          <EmptyState icon="📊" title="Not enough data yet" hint="Log symptoms to see your trend." />
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, padding: "10px 0" }}>
            {trend.slice().reverse().map((p, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div
                  title={`Pain ${p}/10`}
                  style={{
                    height: `${(p / maxPain) * 150}px`,
                    background: p >= 7 ? "var(--danger)" : p >= 4 ? "var(--warn)" : "var(--health)",
                    borderRadius: "8px 8px 0 0",
                    transition: "height .3s",
                  }}
                />
                <div className="muted" style={{ fontSize: ".75rem", marginTop: 6 }}>{p}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: "var(--mint)" }}>
        <div className="row" style={{ gap: 14 }}>
          <div style={{ fontSize: "2rem" }}>💡</div>
          <div>
            <div style={{ fontWeight: 700 }}>Insight</div>
            <div className="muted">
              {data.adherence_rate >= 0.8
                ? "Great work — your medication adherence is strong. Keep it up!"
                : "Your adherence could improve. Enable reminders in the AI Assistant to stay on track."}
              {data.avg_recent_pain != null && data.avg_recent_pain >= 6 &&
                " Your recent pain levels are elevated — consider discussing this with your provider."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
