import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { api } from "../api/client.js";
import { StatCard, ErrorNote, EmptyState } from "../components/ui.jsx";
import { SkeletonStatGrid, SkeletonCard } from "../components/Skeleton.jsx";
import ProgressRing from "../components/ProgressRing.jsx";

export default function Analytics() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const patientId = user.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.patientAnalytics(patientId).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [patientId]);

  if (error) return <ErrorNote message={error} />;

  const trend = (data?.pain_trend || []).slice().reverse().map((p, i) => ({ name: `#${i + 1}`, pain: p }));
  const gridColor = isDark ? "#253352" : "#e2e8f0";
  const lineColor = "#2563eb";

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>Analytics</h1>
        <p>Insights from the Analytics agent — grounded in your real data.</p>
      </div>

      {loading ? <SkeletonStatGrid /> : (
        <div className="grid cols-4">
          <StatCard icon="✅" value={`${Math.round(data.adherence_rate * 100)}%`} label="Medication adherence" accent="#22c55e" />
          <StatCard icon="💊" value={data.active_medications} label="Active medications" accent="#2563eb" />
          <StatCard icon="🩺" value={data.recent_symptom_count} label="Symptom logs" accent="#f59e0b" />
          <StatCard icon="📈" value={data.avg_recent_pain ?? "—"} label="Avg recent pain" accent="#ef4444" />
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1fr auto" }}>
        <div className="card">
          <h3 className="card-title">Pain trend</h3>
          <p className="card-sub">Recent recorded pain levels (0–10)</p>
          {loading ? (
            <SkeletonCard />
          ) : trend.length === 0 ? (
            <EmptyState icon="📊" title="Not enough data yet" hint="Log symptoms to see your trend." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="painGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={gridColor} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke={gridColor} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}
                  formatter={(v) => [`${v}/10`, "Pain"]}
                />
                <Area type="monotone" dataKey="pain" stroke={lineColor} strokeWidth={3} fill="url(#painGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card center" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 180 }}>
          <ProgressRing
            value={data ? data.adherence_rate * 100 : 0}
            size={130}
            color="var(--success)"
            label={data ? `${Math.round(data.adherence_rate * 100)}%` : "—"}
            sublabel="Adherence"
          />
        </div>
      </div>

      {data && (
        <motion.div className="card" style={{ background: "var(--mint)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
        </motion.div>
      )}
    </div>
  );
}
