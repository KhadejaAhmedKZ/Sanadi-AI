import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import ProgressRing from "../components/ProgressRing.jsx";
import AnimatedCounter from "../components/AnimatedCounter.jsx";
import { SkeletonStatGrid, SkeletonCard } from "../components/Skeleton.jsx";
import { dailyWellness, extractVital, computeHealthScore } from "../utils/wellness.js";

const QUICK = [
  { to: "/chat", icon: "💬", title: "Ask the AI", sub: "Clinical, appointments & more" },
  { to: "/appointments", icon: "📅", title: "Appointments", sub: "Book or manage visits" },
  { to: "/medications", icon: "💊", title: "Medications", sub: "Schedule & adherence" },
  { to: "/care/rehabilitation", icon: "🥽", title: "VR Rehab", sub: "Guided physiotherapy" },
];

const WEATHER = { icon: "☀️", temp: 24, condition: "Sunny", place: "Demo location" };

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: "easeOut" },
  };
}

export default function Home() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [rehab, setRehab] = useState(null);
  const [loading, setLoading] = useState(true);
  const isPatient = user?.role === "patient";

  useEffect(() => {
    if (!isPatient) { setLoading(false); return; }
    Promise.all([api.dashboard(user.id), api.rehabProgress(user.id).catch(() => null)])
      .then(([d, r]) => { setDash(d); setRehab(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isPatient]);

  if (user?.role === "caregiver") return <Navigate to="/caregiver" replace />;
  if (user?.role === "provider") return <Navigate to="/provider" replace />;

  const firstName = user?.name?.split(" ")[0] || "there";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const wellness = dailyWellness(user?.id ?? 0);

  const painLevels = (dash?.recent_symptoms ?? [])
    .filter((s) => s.pain_level != null)
    .map((s) => s.pain_level);
  const avgPain = painLevels.length
    ? painLevels.reduce((a, b) => a + b, 0) / painLevels.length
    : null;
  const healthScore = computeHealthScore({
    adherenceRate: dash?.adherence_rate,
    avgPain,
    rehabLevel: rehab?.level,
  });

  const loggedGlucose = extractVital(dash?.recent_symptoms, "Blood glucose:");
  const loggedBp = extractVital(dash?.recent_symptoms, "Blood pressure:");

  const stats = [
    { icon: "❤️", label: "Heart rate", value: wellness.heartRate, suffix: " bpm", accent: "#ef4444" },
    { icon: "🩸", label: "Blood pressure", value: loggedBp || "—", accent: "#f59e0b", raw: true },
    { icon: "💉", label: "Blood glucose", value: loggedGlucose || "—", accent: "#8b5cf6", raw: true },
    { icon: "📈", label: "Recovery", value: rehab ? Math.min(rehab.level * 20, 100) : 0, suffix: "%", accent: "#22c55e" },
    { icon: "✅", label: "Adherence", value: dash ? Math.round(dash.adherence_rate * 100) : 0, suffix: "%", accent: "#2563eb" },
    { icon: "📅", label: "Appointments", value: dash?.appointments?.length ?? 0, accent: "#6366f1" },
    { icon: "😴", label: "Sleep", value: wellness.sleepHours, suffix: "h", accent: "#06b6d4", decimals: 1 },
    { icon: "👣", label: "Steps", value: wellness.steps, accent: "#14b8a6" },
    { icon: "💧", label: "Water", value: wellness.water, suffix: " cups", accent: "#0ea5e9" },
    { icon: "🔥", label: "Calories", value: wellness.calories, suffix: " kcal", accent: "#f97316" },
  ];

  return (
    <div className="grid" style={{ gap: 22 }}>
      <motion.div className="hero-banner" {...fadeUp()}>
        <div className="blob-field">
          <div className="blob" style={{ width: 220, height: 220, background: "#fff", top: -80, right: 40 }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1>Hello, {firstName} 👋</h1>
          <p style={{ margin: "2px 0 0", opacity: .95 }}>{today}</p>
          <p style={{ margin: "10px 0 0", opacity: .95 }}>Your AI healthcare team is ready. How can we support you today?</p>
        </div>
        <div className="row" style={{ position: "relative", zIndex: 1, gap: 18, flexWrap: "wrap" }}>
          <div className="weather-chip">
            <span style={{ fontSize: "1.4rem" }}>{WEATHER.icon}</span>
            <div>
              <div style={{ fontWeight: 800 }}>{WEATHER.temp}°C · {WEATHER.condition}</div>
              <div style={{ fontSize: ".72rem", opacity: .85 }}>{WEATHER.place} (demo)</div>
            </div>
          </div>
          <Link to="/chat" className="btn lg" style={{ background: "rgba(255,255,255,.22)" }}>
            💬 Start a conversation
          </Link>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid cols-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <motion.div className="grid" style={{ gridTemplateColumns: "auto 1fr 1fr" }} {...fadeUp(0.05)}>
          <div className="card center" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <ProgressRing value={healthScore} size={104} color="var(--success)" label={String(healthScore)} sublabel="Health score" />
          </div>

          <div className="card">
            <div className="row" style={{ gap: 10 }}>
              <div className="stat-icon" style={{ background: "var(--primary-100)" }}>📅</div>
              <div>
                <div className="card-sub" style={{ margin: 0 }}>Upcoming appointment</div>
                {dash?.appointments?.[0] ? (
                  <div style={{ fontWeight: 700 }}>
                    {dash.appointments[0].department} — {new Date(dash.appointments[0].scheduled_for).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </div>
                ) : (
                  <div className="muted">Nothing scheduled</div>
                )}
              </div>
            </div>
            <div className="row mt" style={{ gap: 10 }}>
              <div className="stat-icon" style={{ background: "var(--secondary-100)" }}>💊</div>
              <div>
                <div className="card-sub" style={{ margin: 0 }}>Medication reminder</div>
                {dash?.medications?.[0] ? (
                  <div style={{ fontWeight: 700 }}>{dash.medications[0].name} — {dash.medications[0].schedule || "as needed"}</div>
                ) : (
                  <div className="muted">No medications on file</div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-sub" style={{ margin: 0 }}>Recovery progress</div>
            <div className="row between mt" style={{ alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>
                  Level <AnimatedCounter value={rehab?.level ?? 1} />
                </div>
                <div className="muted" style={{ fontSize: ".82rem" }}>
                  <AnimatedCounter value={rehab?.total_points ?? 0} /> points · <AnimatedCounter value={rehab?.total_sessions ?? 0} /> sessions
                </div>
              </div>
              <Link to="/care/rehabilitation" className="btn secondary sm">Open VR Rehab →</Link>
            </div>
          </div>
        </motion.div>
      )}

      <div>
        <h2 style={{ marginBottom: 14 }}>Quick actions</h2>
        <div className="grid cols-4">
          {QUICK.map((q, i) => (
            <motion.div key={q.to} {...fadeUp(0.05 + i * 0.04)}>
              <Link to={q.to} className="quick-action">
                <div className="qa-icon">{q.icon}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{q.title}</div>
                  <div className="muted" style={{ fontSize: ".82rem" }}>{q.sub}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: 14 }}>Today's vitals & activity</h2>
        {loading ? <SkeletonStatGrid count={4} /> : (
          <div className="grid cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="stat-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                whileHover={{ y: -3 }}
              >
                <div className="stat-icon" style={{ background: s.accent + "1c" }}>{s.icon}</div>
                <div className="stat-value">
                  {s.raw ? s.value : <AnimatedCounter value={s.value} suffix={s.suffix || ""} decimals={s.decimals || 0} />}
                </div>
                <div className="stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-title">Today's plan</h3>
          <p className="card-sub">Based on your current medications & appointments</p>
          <ul className="feature-list">
            {dash?.medications?.length ? (
              dash.medications.map((m) => (
                <li key={m.id}>💊 {m.name}{m.dosage ? ` (${m.dosage})` : ""}{m.schedule ? ` — ${m.schedule}` : ""}</li>
              ))
            ) : (
              <li>💊 No medications scheduled</li>
            )}
            {dash?.appointments?.[0] ? (
              <li>
                📅 Next visit: {dash.appointments[0].department} —{" "}
                {new Date(dash.appointments[0].scheduled_for).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </li>
            ) : (
              <li>📅 No upcoming appointments</li>
            )}
            <li>💧 Stay hydrated — drink water regularly</li>
          </ul>
        </div>
        <div className="card">
          <h3 className="card-title">Explore specialized care</h3>
          <p className="card-sub">Tailored modules for your needs</p>
          <ul className="feature-list">
            <li>🥽 Rehabilitation & VR physiotherapy</li>
            <li>🧠 Memory care for Alzheimer's & dementia</li>
            <li>❤️ Chronic disease management</li>
            <li>🫁 Respiratory care</li>
          </ul>
          <Link to="/care" className="btn secondary mt">View all modules →</Link>
        </div>
      </div>
    </div>
  );
}
