import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { Loader, ErrorNote } from "../components/ui.jsx";

// Extra interactive helpers per module (client-side demos of the module tools).
const TOOLS = {
  memory: [
    { icon: "⏰", label: "Set routine reminder", hint: "Medication & daily activities" },
    { icon: "🧩", label: "Start memory exercise", hint: "Simple cognitive games" },
    { icon: "🔔", label: "Caregiver alerts", hint: "Notify family on missed tasks" },
  ],
  chronic: [
    { icon: "🩸", label: "Log blood glucose", hint: "Track diabetes readings" },
    { icon: "❤️", label: "Log blood pressure", hint: "Track hypertension" },
    { icon: "📈", label: "View health trends", hint: "Analytics agent insights" },
  ],
  respiratory: [
    { icon: "🌬️", label: "Guided breathing", hint: "4-7-8 breathing exercise" },
    { icon: "⚠️", label: "Log a trigger", hint: "Dust, smoke, pollen…" },
    { icon: "💨", label: "Inhaler reminder", hint: "Never miss a dose" },
  ],
  pediatric: [
    { icon: "💉", label: "Vaccination schedule", hint: "Track upcoming shots" },
    { icon: "📏", label: "Growth chart", hint: "Height & weight over time" },
    { icon: "🎯", label: "Development milestones", hint: "Age-based checklist" },
  ],
  maternity: [
    { icon: "🤰", label: "Pregnancy timeline", hint: "Week-by-week guidance" },
    { icon: "📅", label: "Prenatal appointments", hint: "Never miss a checkup" },
    { icon: "✅", label: "Preparation checklist", hint: "Get ready for delivery" },
  ],
};

export default function CareModule() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [breathing, setBreathing] = useState(false);

  useEffect(() => {
    api.careModules()
      .then((mods) => {
        const found = mods.find((m) => m.id === moduleId);
        if (!found) throw new Error("Care module not found");
        setModule(found);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [moduleId]);

  if (loading) return <Loader />;
  if (error) return <ErrorNote message={error} />;
  if (!module) return null;

  const tools = TOOLS[module.id] || [];

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div
        className="hero-banner"
        style={{ background: `linear-gradient(120deg, ${module.color}, ${module.color}bb)` }}
      >
        <div>
          <div style={{ fontSize: "2.4rem" }}>{module.icon}</div>
          <h1 style={{ marginTop: 8 }}>{module.name}</h1>
          <p style={{ margin: 0, opacity: .95 }}>{module.tagline}</p>
        </div>
        <button className="btn lg" style={{ background: "rgba(255,255,255,.22)" }} onClick={() => navigate("/chat")}>
          💬 Ask about this
        </button>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-title">Module features</h3>
          <p className="card-sub">What this program includes</p>
          <ul className="feature-list">
            {module.features.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">Quick tools</h3>
          <p className="card-sub">Interactive helpers for this module</p>
          {tools.map((t) => (
            <div className="list-row" key={t.label}>
              <div className="lead">
                <div className="dot">{t.icon}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.label}</div>
                  <div className="muted" style={{ fontSize: ".82rem" }}>{t.hint}</div>
                </div>
              </div>
              {module.id === "respiratory" && t.label === "Guided breathing" ? (
                <button className="btn sm" onClick={() => setBreathing((b) => !b)}>
                  {breathing ? "Stop" : "Start"}
                </button>
              ) : (
                <button className="btn secondary sm" onClick={() => navigate("/chat")}>Open</button>
              )}
            </div>
          ))}

          {breathing && (
            <div className="vr-stage active mt" style={{ minHeight: 180, background: "linear-gradient(160deg, #0f766e, #14b8a6)" }}>
              <div className="avatar-fig">🫁</div>
              <div style={{ fontWeight: 700 }}>Breathe in… hold… breathe out…</div>
              <div className="muted" style={{ color: "#d1fae5" }}>Follow the rhythm for 4 cycles</div>
            </div>
          )}
        </div>
      </div>

      <div className="card center" style={{ background: "var(--mint)" }}>
        Looking for physiotherapy? Try the immersive{" "}
        <Link to="/care/rehabilitation">🥽 VR Rehabilitation module →</Link>
      </div>
    </div>
  );
}
