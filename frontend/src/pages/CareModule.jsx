import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { Loader, ErrorNote } from "../components/ui.jsx";
import BreathingExercise from "../components/BreathingExercise.jsx";
import MemoryGame from "../components/MemoryGame.jsx";
import {
  VitalLogger,
  BloodPressureLogger,
  TriggerLogger,
  ChecklistTool,
  GrowthChart,
  PregnancyTimeline,
  ReminderList,
} from "../components/CareTools.jsx";

const VAX_ITEMS = [
  "Hepatitis B (birth)", "DTaP #1 (2 months)", "Polio #1 (2 months)",
  "MMR (12 months)", "Varicella (12 months)", "DTaP booster (4–6 years)",
];
const MILESTONE_ITEMS = [
  "Smiles responsively", "Sits without support", "First words",
  "Walks independently", "Follows 2-step instructions", "Uses simple sentences",
];
const PREP_ITEMS = [
  "Pack hospital bag", "Choose a pediatrician", "Install car seat",
  "Set up nursery", "Prepare freezer meals", "Write a birth plan",
];

// Each button now opens a real, distinct tool — not just a link to the AI chat.
const TOOLS = {
  memory: [
    { id: "memory-game", icon: "🧩", label: "Memory Match Game", hint: "Play a memory card game", kind: "game" },
    { id: "memory-reminders", icon: "⏰", label: "Routine reminders", hint: "Medication & daily activities", kind: "reminder", storageKey: "sanadi_reminders_memory" },
    { id: "memory-caregiver", icon: "🔔", label: "Caregiver alerts", hint: "Open the caregiver portal", kind: "link", to: "/caregiver" },
  ],
  chronic: [
    { id: "chronic-glucose", icon: "🩸", label: "Log blood glucose", hint: "Track diabetes readings", kind: "vital", vitalLabel: "Blood glucose", unit: "mg/dL" },
    { id: "chronic-bp", icon: "❤️", label: "Log blood pressure", hint: "Track hypertension", kind: "bp" },
    { id: "chronic-trends", icon: "📈", label: "View health trends", hint: "Analytics agent insights", kind: "link", to: "/analytics" },
  ],
  respiratory: [
    { id: "resp-breathing", icon: "🌬️", label: "Guided breathing", hint: "4-7-8 breathing exercise", kind: "breathing" },
    { id: "resp-trigger", icon: "⚠️", label: "Log a trigger", hint: "Dust, smoke, pollen…", kind: "trigger" },
    { id: "resp-inhaler", icon: "💨", label: "Inhaler reminder", hint: "Never miss a dose", kind: "reminder", storageKey: "sanadi_reminders_inhaler" },
  ],
  pediatric: [
    { id: "ped-vax", icon: "💉", label: "Vaccination schedule", hint: "Track upcoming shots", kind: "checklist", storageKey: "sanadi_checklist_vax", items: VAX_ITEMS },
    { id: "ped-growth", icon: "📏", label: "Growth chart", hint: "Height & weight over time", kind: "growth", storageKey: "sanadi_growth" },
    { id: "ped-milestones", icon: "🎯", label: "Development milestones", hint: "Age-based checklist", kind: "checklist", storageKey: "sanadi_checklist_milestones", items: MILESTONE_ITEMS },
  ],
  maternity: [
    { id: "mat-timeline", icon: "🤰", label: "Pregnancy timeline", hint: "Week-by-week guidance", kind: "timeline", storageKey: "sanadi_pregnancy_week" },
    { id: "mat-appts", icon: "📅", label: "Prenatal appointments", hint: "Never miss a checkup", kind: "link", to: "/appointments" },
    { id: "mat-prep", icon: "✅", label: "Preparation checklist", hint: "Get ready for delivery", kind: "checklist", storageKey: "sanadi_checklist_prep", items: PREP_ITEMS },
  ],
};

export default function CareModule() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTool, setActiveTool] = useState(null);

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

  useEffect(() => setActiveTool(null), [moduleId]);

  if (loading) return <Loader />;
  if (error) return <ErrorNote message={error} />;
  if (!module) return null;

  const tools = TOOLS[module.id] || [];
  const current = tools.find((t) => t.id === activeTool);

  async function logVital(description) {
    if (user?.role !== "patient") {
      throw new Error("Log in as a patient to record readings.");
    }
    await api.logSymptom({ patient_id: user.id, description, pain_level: null });
  }

  function handleToolClick(tool) {
    if (tool.kind === "link") {
      navigate(tool.to);
      return;
    }
    setActiveTool((cur) => (cur === tool.id ? null : tool.id));
  }

  // Scope client-only tool data (reminders, checklists…) per logged-in user,
  // so switching accounts on the same browser doesn't mix personal data.
  const scopedKey = (key) => `${key}_u${user?.id ?? "anon"}`;

  function renderTool(tool) {
    switch (tool.kind) {
      case "breathing":
        return <BreathingExercise onClose={() => setActiveTool(null)} />;
      case "game":
        return <MemoryGame />;
      case "vital":
        return <VitalLogger label={tool.vitalLabel} unit={tool.unit} onLog={logVital} />;
      case "bp":
        return <BloodPressureLogger onLog={logVital} />;
      case "trigger":
        return <TriggerLogger onLog={logVital} />;
      case "checklist":
        return <ChecklistTool storageKey={scopedKey(tool.storageKey)} items={tool.items} />;
      case "growth":
        return <GrowthChart storageKey={scopedKey(tool.storageKey)} />;
      case "timeline":
        return <PregnancyTimeline storageKey={scopedKey(tool.storageKey)} />;
      case "reminder":
        return <ReminderList storageKey={scopedKey(tool.storageKey)} placeholder={`Add a ${module.name.toLowerCase()} reminder`} />;
      default:
        return null;
    }
  }

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
            <div className="list-row" key={t.id}>
              <div className="lead">
                <div className="dot">{t.icon}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.label}</div>
                  <div className="muted" style={{ fontSize: ".82rem" }}>{t.hint}</div>
                </div>
              </div>
              <button className="btn secondary sm" onClick={() => handleToolClick(t)}>
                {t.kind === "link" ? "Open" : activeTool === t.id ? "Close" : "Open"}
              </button>
            </div>
          ))}

          {current && <div className="mt">{renderTool(current)}</div>}
        </div>
      </div>

      <div className="card center" style={{ background: "var(--mint)" }}>
        Looking for physiotherapy? Try the immersive{" "}
        <Link to="/care/rehabilitation">🥽 VR Rehabilitation module →</Link>
      </div>
    </div>
  );
}
