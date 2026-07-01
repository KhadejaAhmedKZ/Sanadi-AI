import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { StatCard, Loader } from "../components/ui.jsx";

const QUICK = [
  { to: "/chat", icon: "💬", title: "Ask the AI", sub: "Clinical, appointments & more" },
  { to: "/appointments", icon: "📅", title: "Appointments", sub: "Book or manage visits" },
  { to: "/medications", icon: "💊", title: "Medications", sub: "Schedule & adherence" },
  { to: "/care/rehabilitation", icon: "🥽", title: "VR Rehab", sub: "Guided physiotherapy" },
];

export default function Home() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const isPatient = user?.role === "patient";

  useEffect(() => {
    if (!isPatient) { setLoading(false); return; }
    api.dashboard(user.id).then(setDash).catch(() => {}).finally(() => setLoading(false));
  }, [user, isPatient]);

  // Caregivers and providers have their own home — send them there.
  if (user?.role === "caregiver") return <Navigate to="/caregiver" replace />;
  if (user?.role === "provider") return <Navigate to="/provider" replace />;

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="hero-banner">
        <div>
          <h1>Hello, {firstName} 👋</h1>
          <p style={{ margin: 0, opacity: .95 }}>
            Your AI healthcare team is ready. How can we support you today?
          </p>
        </div>
        <Link to="/chat" className="btn lg" style={{ background: "rgba(255,255,255,.22)" }}>
          💬 Start a conversation
        </Link>
      </div>

      {loading ? (
        <Loader />
      ) : dash ? (
        <div className="grid cols-4">
          <StatCard icon="💊" value={dash.medications.length} label="Active medications" accent="#0ea5e9" />
          <StatCard icon="📅" value={dash.appointments.length} label="Upcoming appointments" accent="#6366f1" />
          <StatCard icon="✅" value={`${Math.round(dash.adherence_rate * 100)}%`} label="Medication adherence" accent="#10b981" />
          <StatCard icon="🩺" value={dash.recent_symptoms.length} label="Recent symptom logs" accent="#f59e0b" />
        </div>
      ) : null}

      <div>
        <h2 style={{ marginBottom: 14 }}>Quick actions</h2>
        <div className="grid cols-4">
          {QUICK.map((q) => (
            <Link key={q.to} to={q.to} className="quick-action">
              <div className="qa-icon">{q.icon}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{q.title}</div>
                <div className="muted" style={{ fontSize: ".82rem" }}>{q.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-title">Today's plan</h3>
          <p className="card-sub">Based on your current medications & appointments</p>
          <ul className="feature-list">
            {dash?.medications?.length ? (
              dash.medications.map((m) => (
                <li key={m.id}>
                  💊 {m.name}{m.dosage ? ` (${m.dosage})` : ""}{m.schedule ? ` — ${m.schedule}` : ""}
                </li>
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
