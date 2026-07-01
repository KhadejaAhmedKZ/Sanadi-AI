import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { Loader, EmptyState, ErrorNote } from "../components/ui.jsx";

const DEPARTMENTS = ["General", "Cardiology", "Orthopedics", "Physiotherapy", "Neurology", "Pediatrics", "Respiratory", "Maternity"];

export default function Appointments() {
  const { user } = useAuth();
  const patientId = user.id;
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ department: "General", reason: "", scheduled_for: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setAppts(await api.appointments(patientId));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [patientId]);

  async function book(e) {
    e.preventDefault();
    if (!form.scheduled_for) return;
    setSaving(true);
    setError("");
    try {
      await api.bookAppointment({
        patient_id: patientId,
        department: form.department,
        reason: form.reason,
        scheduled_for: new Date(form.scheduled_for).toISOString(),
      });
      setForm({ department: "General", reason: "", scheduled_for: "" });
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function cancel(id) {
    try { await api.cancelAppointment(id); await load(); }
    catch (e) { setError(e.message); }
  }

  const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>Appointments</h1>
        <p>Book and manage your visits — handled by the Operations agent.</p>
      </div>

      <ErrorNote message={error} />

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-title">Book an appointment</h3>
          <p className="card-sub">Choose a department and time</p>
          <form onSubmit={book}>
            <label className="field">
              <span>Department</span>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Reason</span>
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Follow-up checkup" />
            </label>
            <label className="field">
              <span>Date & time</span>
              <input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} required />
            </label>
            <button className="btn block" disabled={saving}>{saving ? "Booking…" : "📅 Book appointment"}</button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Your appointments</h3>
          <p className="card-sub">Scheduled and past visits</p>
          {loading ? <Loader /> : appts.length === 0 ? (
            <EmptyState icon="📅" title="No appointments yet" hint="Book one on the left." />
          ) : (
            appts.map((a) => (
              <div className="list-row" key={a.id}>
                <div className="lead">
                  <div className="dot">🏥</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.department}</div>
                    <div className="muted" style={{ fontSize: ".82rem" }}>{a.reason || "General"} · {fmt(a.scheduled_for)}</div>
                  </div>
                </div>
                <div className="row">
                  <span className={"badge " + (a.status === "cancelled" ? "gray" : a.status === "completed" ? "green" : "")}>{a.status}</span>
                  {a.status === "scheduled" && (
                    <button className="btn danger sm" onClick={() => cancel(a.id)}>Cancel</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
