import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import BodyFigure, { intensityColor } from "../components/BodyFigure.jsx";
import Markdown from "../components/Markdown.jsx";
import { ErrorNote } from "../components/ui.jsx";

const PAIN_TYPES = ["sharp", "dull", "burning", "throbbing"];
const LEGEND = [
  { label: "No pain (0)", color: "#22c55e" },
  { label: "Mild (1–3)", color: "#eab308" },
  { label: "Moderate (4–6)", color: "#f97316" },
  { label: "Severe (7–8)", color: "#ef4444" },
  { label: "Very severe / chronic (9–10)", color: "#7c3aed" },
];

const EMPTY_FORM = {
  intensity: 5, pain_type: "dull", started: "", worse_with: "",
  swelling: false, redness: false, injury: false, notes: "",
};

export default function BodyMap() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [side, setSide] = useState("front");
  const [sex, setSex] = useLocalStorage(`sanadi_bodysex_${user?.id ?? "anon"}`, "female");
  const [latest, setLatest] = useState({});
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { emergency, specialist, specialist_why, id }
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await api.bodyAssessments(user.id);
      setLatest(res.latest);
      setHistory(res.history);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectRegion(region) {
    setSelected(region);
    setResult(null);
    setAiText("");
    const prev = latest[region];
    setForm(prev ? {
      intensity: prev.intensity, pain_type: prev.pain_type || "dull",
      started: prev.started || "", worse_with: prev.worse_with || "",
      swelling: prev.swelling, redness: prev.redness, injury: prev.injury,
      notes: prev.notes || "",
    } : EMPTY_FORM);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.saveBodyAssessment({
        patient_id: user.id, region: selected, side, ...form,
        intensity: Number(form.intensity),
      });
      setResult(res);
      await load();
      if (res.emergency) toast.error("Emergency guidance shown — please read it");
      else toast.success(`Saved — ${selected} logged at ${form.intensity}/10`);
    } catch (e) { setError(e.message); toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function getAi() {
    if (!result?.id) return;
    setAiLoading(true);
    try {
      const res = await api.analyzeBodyAssessment(result.id);
      setAiText(res.assessment);
    } catch (e) { toast.error(e.message); }
    finally { setAiLoading(false); }
  }

  const regionHistory = selected ? history.filter((h) => h.region === selected) : [];
  const recent = history.slice(0, 5);

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🧍 Body Map</h1>
        <p>Tap where it hurts — the AI collects the details, checks for warning signs, and points you to the right specialist.</p>
      </div>

      <ErrorNote message={error} />

      <div className="bodymap-shell">
        {/* LEFT: legend + recent */}
        <div className="grid" style={{ gap: 16, alignContent: "start" }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 className="card-title" style={{ fontSize: ".95rem" }}>Pain intensity</h3>
            {LEGEND.map((l) => (
              <div key={l.label} className="row" style={{ gap: 8, padding: "4px 0" }}>
                <span style={{ width: 12, height: 12, borderRadius: 99, background: l.color, flexShrink: 0 }} />
                <span className="muted" style={{ fontSize: ".82rem" }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 className="card-title" style={{ fontSize: ".95rem" }}>Recent selections</h3>
            {recent.length === 0 ? (
              <p className="muted" style={{ fontSize: ".82rem", margin: 0 }}>Nothing logged yet.</p>
            ) : recent.map((h) => (
              <button
                key={h.id}
                className="bm-recent-row"
                onClick={() => { setSide(h.side); selectRegion(h.region); }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 99, background: intensityColor(h.intensity), flexShrink: 0 }} />
                <span>
                  <span style={{ fontWeight: 700, fontSize: ".84rem", display: "block" }}>{h.region}</span>
                  <span className="muted" style={{ fontSize: ".74rem" }}>
                    {h.intensity}/10 · {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: the figure */}
        <div className="card center" style={{ padding: 18 }}>
          <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
            <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
              <button className={"tab" + (side === "front" ? " active" : "")} onClick={() => setSide("front")}>Front</button>
              <button className={"tab" + (side === "back" ? " active" : "")} onClick={() => setSide("back")}>Back</button>
            </div>
            <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
              <button className={"tab" + (sex === "female" ? " active" : "")} onClick={() => setSex("female")}>♀ Female</button>
              <button className={"tab" + (sex === "male" ? " active" : "")} onClick={() => setSex("male")}>♂ Male</button>
            </div>
          </div>
          <BodyFigure side={side} sex={sex} latest={latest} selected={selected} onSelect={selectRegion} />
          <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>
            Tap any dot to assess that area · colored dots show your latest reports
          </p>
        </div>

        {/* RIGHT: assessment */}
        <div className="grid" style={{ gap: 16, alignContent: "start" }}>
          {!selected ? (
            <div className="card center" style={{ padding: 28 }}>
              <div style={{ fontSize: "2rem" }}>👆</div>
              <p className="muted" style={{ margin: "8px 0 0" }}>Select a body area to start an assessment.</p>
            </div>
          ) : (
            <motion.div className="card" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} key={selected}>
              <div className="row between">
                <h3 className="card-title" style={{ marginBottom: 0 }}>{selected}</h3>
                <span className="badge" style={{ background: intensityColor(Number(form.intensity)), color: "#fff" }}>
                  {form.intensity}/10
                </span>
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                <span>Pain level: {form.intensity}/10</span>
                <input
                  type="range" min="0" max="10" value={form.intensity}
                  onChange={(e) => setForm({ ...form, intensity: e.target.value })}
                  style={{ accentColor: intensityColor(Number(form.intensity)) }}
                />
              </label>
              <label className="field">
                <span>Type of pain</span>
                <select value={form.pain_type} onChange={(e) => setForm({ ...form, pain_type: e.target.value })}>
                  {PAIN_TYPES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="field">
                <span>When did it start?</span>
                <input value={form.started} onChange={(e) => setForm({ ...form, started: e.target.value })} placeholder="e.g. 2 days ago" />
              </label>
              <label className="field">
                <span>What makes it worse?</span>
                <input value={form.worse_with} onChange={(e) => setForm({ ...form, worse_with: e.target.value })} placeholder="e.g. walking, climbing stairs" />
              </label>
              <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
                {[["swelling", "Swelling"], ["redness", "Redness"], ["injury", "Recent injury"]].map(([k, label]) => (
                  <label key={k} className="badge gray" style={{ padding: "8px 12px", cursor: "pointer" }}>
                    <input
                      type="checkbox" checked={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
                      style={{ width: "auto", marginRight: 6 }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <label className="field">
                <span>Notes (optional)</span>
                <textarea
                  value={form.notes} maxLength={400}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Anything else the care team should know…"
                  style={{ minHeight: 64, resize: "vertical" }}
                />
              </label>
              <button className="btn block" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "💾 Save assessment"}
              </button>

              {regionHistory.length > 1 && (
                <div style={{ marginTop: 14 }}>
                  <div className="card-sub" style={{ marginBottom: 6 }}>History — {selected}</div>
                  {regionHistory.slice(0, 4).map((h) => (
                    <div key={h.id} className="row" style={{ gap: 8, padding: "3px 0", fontSize: ".8rem" }}>
                      <span style={{ width: 9, height: 9, borderRadius: 99, background: intensityColor(h.intensity) }} />
                      <span className="muted">
                        {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {h.intensity}/10
                        {h.notes ? ` — ${h.notes.slice(0, 40)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={result.emergency ? { background: "var(--danger-100)", borderColor: "var(--danger)" } : undefined}
              >
                {result.emergency ? (
                  <>
                    <h3 className="card-title">🚨 Please read this first</h3>
                    <p style={{ lineHeight: 1.6, margin: 0 }}>{result.emergency}</p>
                  </>
                ) : (
                  <>
                    <h3 className="card-title">Recommended specialist</h3>
                    <div className="row" style={{ gap: 10, margin: "6px 0 10px" }}>
                      <div className="stat-icon" style={{ background: "var(--primary-100)" }}>👨‍⚕️</div>
                      <div>
                        <div style={{ fontWeight: 800 }}>{result.specialist}</div>
                        <div className="muted" style={{ fontSize: ".8rem" }}>{result.specialist_why}</div>
                      </div>
                    </div>
                    {aiLoading ? (
                      <div className="pulse muted" style={{ padding: "8px 0" }}>🧠 Preparing your assessment…</div>
                    ) : aiText ? (
                      <div style={{ lineHeight: 1.6, fontSize: ".92rem" }}><Markdown text={aiText} /></div>
                    ) : (
                      <button className="btn secondary block" onClick={getAi}>🧠 Get AI preliminary assessment</button>
                    )}
                    <div className="row" style={{ gap: 8, marginTop: 12 }}>
                      <button
                        className="btn sm"
                        onClick={() => navigate("/find-care", { state: { specialty: result.specialist } })}
                      >
                        🏥 Find a specialist
                      </button>
                      <button
                        className="btn secondary sm"
                        onClick={() => navigate("/appointments", { state: { department: result.specialist, place: `${selected} assessment` } })}
                      >
                        📅 Book appointment
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
