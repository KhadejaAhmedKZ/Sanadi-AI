import { useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

// ---------- Single-number vital logger (blood glucose, etc.) ----------
export function VitalLogger({ label, unit, onLog }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!value) return;
    setSaving(true);
    try {
      await onLog(`${label}: ${value} ${unit}`);
      setMessage(`Logged ${value} ${unit} ✓`);
      setValue("");
    } catch (err) {
      setMessage(`⚠️ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="care-tool-panel" onSubmit={submit}>
      <label className="field">
        <span>{label} ({unit})</span>
        <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} required />
      </label>
      <button className="btn sm" disabled={saving}>{saving ? "Saving…" : "Save reading"}</button>
      {message && <div className="muted mt" style={{ fontSize: ".82rem" }}>{message}</div>}
    </form>
  );
}

// ---------- Blood pressure logger (two numbers) ----------
export function BloodPressureLogger({ onLog }) {
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!sys || !dia) return;
    setSaving(true);
    try {
      await onLog(`Blood pressure: ${sys}/${dia} mmHg`);
      setMessage(`Logged ${sys}/${dia} mmHg ✓`);
      setSys("");
      setDia("");
    } catch (err) {
      setMessage(`⚠️ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="care-tool-panel" onSubmit={submit}>
      <div className="row" style={{ gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Systolic</span>
          <input type="number" value={sys} onChange={(e) => setSys(e.target.value)} required />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Diastolic</span>
          <input type="number" value={dia} onChange={(e) => setDia(e.target.value)} required />
        </label>
      </div>
      <button className="btn sm" disabled={saving}>{saving ? "Saving…" : "Save reading"}</button>
      {message && <div className="muted mt" style={{ fontSize: ".82rem" }}>{message}</div>}
    </form>
  );
}

// ---------- Respiratory trigger logger ----------
const TRIGGERS = ["Dust", "Smoke", "Pollen", "Cold air", "Exercise", "Pet dander"];

export function TriggerLogger({ onLog }) {
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await onLog(`Respiratory trigger: ${selected}${note ? ` — ${note}` : ""}`);
      setMessage("Trigger logged ✓");
      setSelected(null);
      setNote("");
    } catch (err) {
      setMessage(`⚠️ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="care-tool-panel" onSubmit={submit}>
      <div className="suggestions" style={{ marginBottom: 10 }}>
        {TRIGGERS.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setSelected(t)}
            style={selected === t ? { background: "var(--brand)", color: "#fff", borderColor: "var(--brand)" } : undefined}
          >
            {t}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. mild cough after" />
      </label>
      <button className="btn sm" disabled={saving || !selected}>{saving ? "Saving…" : "Log trigger"}</button>
      {message && <div className="muted mt" style={{ fontSize: ".82rem" }}>{message}</div>}
    </form>
  );
}

// ---------- Persisted checklist (vaccinations, milestones, prep list…) ----------
export function ChecklistTool({ storageKey, items }) {
  const [checked, setChecked] = useLocalStorage(storageKey, {});
  const doneCount = items.filter((i) => checked[i]).length;

  return (
    <div className="care-tool-panel">
      <div className="muted mb" style={{ fontSize: ".82rem" }}>{doneCount}/{items.length} completed</div>
      {items.map((item) => (
        <label key={item} className="checklist-row">
          <input
            type="checkbox"
            checked={!!checked[item]}
            onChange={() => setChecked({ ...checked, [item]: !checked[item] })}
          />
          <span className={checked[item] ? "done" : ""}>{item}</span>
        </label>
      ))}
    </div>
  );
}

// ---------- Growth chart (height/weight log) ----------
export function GrowthChart({ storageKey }) {
  const [entries, setEntries] = useLocalStorage(storageKey, []);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  function add(e) {
    e.preventDefault();
    if (!height && !weight) return;
    setEntries([...entries, { date: new Date().toISOString(), height, weight }].slice(-12));
    setHeight("");
    setWeight("");
  }

  return (
    <div className="care-tool-panel">
      <form className="row wrap" onSubmit={add} style={{ gap: 8 }}>
        <input type="number" placeholder="Height (cm)" value={height} onChange={(e) => setHeight(e.target.value)} style={{ maxWidth: 130 }} />
        <input type="number" placeholder="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ maxWidth: 130 }} />
        <button className="btn sm">Add entry</button>
      </form>
      {entries.length === 0 ? (
        <div className="muted mt" style={{ fontSize: ".85rem" }}>No entries yet — add the first one above.</div>
      ) : (
        <div className="mt">
          {entries.slice().reverse().map((e, i) => (
            <div className="list-row" key={i}>
              <span className="muted" style={{ fontSize: ".85rem" }}>{new Date(e.date).toLocaleDateString()}</span>
              <span style={{ fontWeight: 600 }}>
                {e.height ? `${e.height} cm` : ""}{e.height && e.weight ? " · " : ""}{e.weight ? `${e.weight} kg` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Pregnancy week timeline ----------
function weekTip(week) {
  if (week < 13) return "First trimester — the baby's organs are forming. Take prenatal vitamins and stay hydrated.";
  if (week < 27) return "Second trimester — often called the 'golden period'. Many feel more energetic now.";
  if (week < 37) return "Third trimester — the baby is gaining weight quickly. Start preparing your hospital bag.";
  return "Full term — baby could arrive any day now. Rest and stay close to your care team.";
}

export function PregnancyTimeline({ storageKey }) {
  const [week, setWeek] = useLocalStorage(storageKey, 12);
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;

  return (
    <div className="care-tool-panel">
      <div className="row between">
        <strong>Week {week}</strong>
        <span className="badge">Trimester {trimester}</span>
      </div>
      <input
        type="range"
        min="1"
        max="40"
        value={week}
        onChange={(e) => setWeek(Number(e.target.value))}
        className="mt"
        style={{ width: "100%" }}
      />
      <p className="muted mt" style={{ fontSize: ".85rem" }}>{weekTip(week)}</p>
    </div>
  );
}

// ---------- Reminder list (routine / inhaler reminders) ----------
export function ReminderList({ storageKey, placeholder }) {
  const [items, setItems] = useLocalStorage(storageKey, []);
  const [text, setText] = useState("");
  const [time, setTime] = useState("");

  function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setItems([...items, { id: Date.now(), text, time, done: false }]);
    setText("");
    setTime("");
  }
  function toggle(id) {
    setItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }
  function remove(id) {
    setItems(items.filter((i) => i.id !== id));
  }

  return (
    <div className="care-tool-panel">
      <form className="row wrap" onSubmit={add} style={{ gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder || "Reminder"}
          style={{ flex: 1, minWidth: 140 }}
        />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ maxWidth: 120 }} />
        <button className="btn sm">Add</button>
      </form>
      {items.length === 0 ? (
        <div className="muted mt" style={{ fontSize: ".85rem" }}>No reminders yet.</div>
      ) : (
        <div className="mt">
          {items.map((i) => (
            <div className="list-row" key={i.id}>
              <label className="row" style={{ gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={i.done} onChange={() => toggle(i.id)} />
                <span className={i.done ? "done" : ""}>{i.text}{i.time ? ` — ${i.time}` : ""}</span>
              </label>
              <button className="btn ghost sm" onClick={() => remove(i.id)} aria-label="Remove reminder">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
