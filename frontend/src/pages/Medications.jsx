import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import { EmptyState, ErrorNote } from "../components/ui.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";

export default function Medications() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const patientId = user.id;
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      toast.success(`${form.name} added to your medications`);
    } catch (e) { setError(e.message); toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function takeDose(med, taken) {
    try {
      await api.logDose(med.id, taken);
      taken ? toast.success(`Logged dose of ${med.name} ✓`) : toast.warning(`Marked ${med.name} as missed`);
    } catch (e) { setError(e.message); toast.error(e.message); }
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>Medications</h1>
        <p>Track prescriptions and log doses — the Engagement agent keeps you on schedule.</p>
      </div>

      <ErrorNote message={error} />

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
          {loading ? <SkeletonList rows={3} bare /> : meds.length === 0 ? (
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
                  <button
                    className="btn ghost sm"
                    title="Request home delivery of this medication"
                    onClick={async () => {
                      try {
                        await api.createDelivery({ patient_id: patientId, medication_id: m.id, created_by: "patient" });
                        toast.success(`Delivery requested for ${m.name}`);
                        navigate("/deliveries");
                      } catch (e) { toast.error(e.message); }
                    }}
                  >
                    🚚 Deliver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
