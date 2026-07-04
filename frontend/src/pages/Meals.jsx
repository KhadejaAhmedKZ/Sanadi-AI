import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import Markdown from "../components/Markdown.jsx";
import { EmptyState, ErrorNote } from "../components/ui.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

export default function Meals() {
  const { user } = useAuth();
  const toast = useToast();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null); // { file, url }
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    try { setMeals(await api.meals(user.id)); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);

  async function submitText(e) {
    e.preventDefault();
    if (!text.trim() || saving) return;
    setSaving(true); setError("");
    try {
      await api.logMeal({ patient_id: user.id, description: text.trim() });
      setText("");
      await load();
      toast.success("Logged — see the AI feedback below");
    } catch (e) { setError(e.message); toast.error(e.message); }
    finally { setSaving(false); }
  }

  function pickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast.error("That image is too large (max 8MB)."); return; }
    if (pending) URL.revokeObjectURL(pending.url);
    setPending({ file, url: URL.createObjectURL(file) });
  }

  async function submitImage() {
    if (!pending || saving) return;
    setSaving(true); setError("");
    try {
      await api.logMealImage(user.id, pending.file, text.trim());
      URL.revokeObjectURL(pending.url);
      setPending(null); setText("");
      await load();
      toast.success("Photo analyzed — see the AI feedback below");
    } catch (e) { setError(e.message); toast.error(e.message); }
    finally { setSaving(false); }
  }

  const today = meals.filter((m) => isToday(m.created_at));

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🍎 What I Ate</h1>
        <p>Log a meal by typing it or snapping a photo — the AI gives friendly nutrition feedback tuned to your health.</p>
      </div>

      <ErrorNote message={error} />

      <div className="grid cols-2">
        {/* Log a meal */}
        <div className="card">
          <h3 className="card-title">Log a meal</h3>
          <p className="card-sub">Describe it in words, or add a photo</p>
          <form onSubmit={submitText}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Grilled chicken with rice and salad, and a glass of water"
              style={{ minHeight: 80, resize: "vertical" }}
              maxLength={500}
            />
            {pending && (
              <div className="meal-preview">
                <img src={pending.url} alt="Meal to log" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".85rem" }}>Photo ready</div>
                  <div className="muted" style={{ fontSize: ".78rem" }}>Add a caption above (optional), then analyze.</div>
                </div>
                <button className="btn ghost sm" onClick={() => { URL.revokeObjectURL(pending.url); setPending(null); }} type="button">✕</button>
              </div>
            )}
            <div className="row wrap" style={{ gap: 10, marginTop: 12 }}>
              <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={pickImage} />
              <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}>📷 Add photo</button>
              {pending ? (
                <button type="button" className="btn" onClick={submitImage} disabled={saving}>
                  {saving ? "Analyzing…" : "🍽️ Analyze photo"}
                </button>
              ) : (
                <button className="btn" disabled={saving || !text.trim()}>
                  {saving ? "Logging…" : "🍽️ Log meal"}
                </button>
              )}
            </div>
          </form>
          <p className="muted" style={{ fontSize: ".76rem", marginTop: 10 }}>
            Guidance only — not a medical diagnosis. Photos are analyzed by the AI and not stored.
          </p>
        </div>

        {/* Today summary */}
        <div className="card">
          <h3 className="card-title">Today</h3>
          <p className="card-sub">{today.length} meal{today.length === 1 ? "" : "s"} logged
            {today.some((m) => m.flagged) ? " · ⚠️ one flagged" : today.length ? " · looking good" : ""}</p>
          {today.length === 0 ? (
            <EmptyState icon="🍽️" title="Nothing logged today" hint="Add your first meal on the left." />
          ) : today.map((m) => (
            <div className="list-row" key={m.id}>
              <div className="lead">
                <div className="dot">{m.kind === "photo" ? "📷" : "🍴"}</div>
                <div>{m.description}</div>
              </div>
              {m.flagged && <span className="badge red">flag</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Meal history with AI feedback */}
      <div className="card">
        <h3 className="card-title">Meal log & AI feedback</h3>
        {loading ? <SkeletonList /> : meals.length === 0 ? (
          <EmptyState icon="🍎" title="No meals yet" hint="Log what you ate to get AI nutrition feedback." />
        ) : meals.map((m, i) => (
          <motion.div
            key={m.id}
            className="meal-entry"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
          >
            <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700 }}>
                {m.kind === "photo" ? "📷 " : "🍴 "}{m.description}
              </div>
              <span className="muted" style={{ fontSize: ".76rem" }}>
                {new Date(m.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
            <div className={"meal-note" + (m.flagged ? " flagged" : "")}>
              {m.flagged && <span className="badge red" style={{ marginBottom: 6 }}>⚠️ worth noting</span>}
              <Markdown text={m.ai_note} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
