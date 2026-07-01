import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { Loader, EmptyState, ErrorNote } from "../components/ui.jsx";

export default function Medications() {
  const { user } = useAuth();
  const patientId = user.id;
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ name: "", dosage: "", schedule: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setMeds(await api.medications(patientId)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [patientId]);

  async function add(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.addMedication({ patient_id: patientId, ...form });
      setForm({ name: "", dosage: "", schedule: "" });
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function takeDose(med, taken) {
    try {
      await api.logDose(med.id, taken);
      setToast(taken ? `✅ Logged dose of ${med.name}` : `⚠️ Marked ${med.name} as missed`);
      setTimeout(() => setToast(""), 2500);
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>Medications</h1>
        <p>Track prescriptions and log doses — the Engagement agent keeps you on schedule.</p>
      </div>

      <ErrorNote message={error} />
      {toast && <div className="badge green" style={{ padding: "10px 16px", alignSelf: "flex-start" }}>{toast}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-title">Add medication</h3>
          <p className="card-sub">Keep your list up to date</p>
          <form onSubmit={add}>
            <label className="field"><span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Metformin" required />
            </label>
            <label className="field"><span>Dosage</span>
              <input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg" />
            </label>
            <label className="field"><span>Schedule (times)</span>
              <input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="e.g. 08:00,20:00" />
            </label>
            <button className="btn block" disabled={saving}>{saving ? "Adding…" : "💊 Add medication"}</button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Your medications</h3>
          <p className="card-sub">Log each dose as taken or missed</p>
          {loading ? <Loader /> : meds.length === 0 ? (
            <EmptyState icon="💊" title="No medications yet" hint="Add one on the left." />
          ) : (
            meds.map((m) => (
              <div className="list-row" key={m.id}>
                <div className="lead">
                  <div className="dot">💊</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.name}</div>
                    <div className="muted" style={{ fontSize: ".82rem" }}>{m.dosage || "—"} · {m.schedule || "as needed"}</div>
                  </div>
                </div>
                <div className="row">
                  <button className="btn success sm" onClick={() => takeDose(m, true)}>Taken</button>
                  <button className="btn secondary sm" onClick={() => takeDose(m, false)}>Missed</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
