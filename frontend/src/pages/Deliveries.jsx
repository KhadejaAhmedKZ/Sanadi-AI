import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import { EmptyState, ErrorNote } from "../components/ui.jsx";

const FLOW = ["requested", "confirmed", "dispatched", "out_for_delivery", "delivered"];
const STEP_LABEL = { requested: "Requested", confirmed: "Confirmed", dispatched: "Dispatched", out_for_delivery: "Out for delivery", delivered: "Delivered" };
const PHARMACIES = ["Sanadi Partner Pharmacy", "LifePlus Pharmacy", "Aster Pharmacy", "BinSina Pharmacy"];

function Tracker({ status }) {
  if (status === "cancelled") return <span className="badge red">Cancelled</span>;
  const at = FLOW.indexOf(status);
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
      {FLOW.map((s, i) => {
        const done = i <= at;
        return (
          <div key={s} className="row" style={{ gap: 6, alignItems: "center" }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, color: "#fff", background: done ? "var(--success)" : "var(--border)" }}>
              {done ? "✓" : i + 1}
            </span>
            <span style={{ fontSize: ".74rem", fontWeight: done ? 700 : 400, color: done ? "var(--text)" : "var(--muted)" }}>{STEP_LABEL[s]}</span>
            {i < FLOW.length - 1 && <span style={{ width: 14, height: 2, background: i < at ? "var(--success)" : "var(--border)" }} />}
          </div>
        );
      })}
    </div>
  );
}

export default function Deliveries() {
  const { user } = useAuth();
  const toast = useToast();
  const isCarer = user.role === "caregiver";
  const [patientId, setPatientId] = useState(isCarer ? 1 : user.id);

  const [meds, setMeds] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [medId, setMedId] = useState("");
  const [pharmacy, setPharmacy] = useState(PHARMACIES[0]);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [m, d] = await Promise.all([api.medications(patientId).catch(() => []), api.deliveries(patientId).catch(() => [])]);
      setMeds(m); setDeliveries(d);
      if (m[0]) setMedId((v) => v || String(m[0].id));
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function request() {
    if (!medId) { toast.error("Choose a medication"); return; }
    setBusy(true);
    try {
      await api.createDelivery({ patient_id: patientId, medication_id: Number(medId), pharmacy, address, created_by: isCarer ? "caregiver" : "patient" });
      setAddress("");
      toast.success("Delivery requested — the pharmacy will confirm shortly");
      load();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  async function advance(id) {
    try { await api.advanceDelivery(id); load(); } catch (e) { toast.error(e.message); }
  }
  async function cancel(id) {
    try { await api.cancelDelivery(id); toast.success("Delivery cancelled"); load(); } catch (e) { toast.error(e.message); }
  }

  const field = { fontFamily: "inherit", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", width: "100%", fontSize: 14, background: "var(--surface)", color: "var(--text)" };

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🚚 Medication Delivery</h1>
        <p>
          Request home delivery of prescribed medications and track them to your door.
          <span className="badge gray" style={{ marginLeft: 8 }}>prototype · synthetic pharmacies</span>
        </p>
      </div>

      {isCarer && (
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: ".85rem" }}>Patient</span>
          <input type="number" min="1" value={patientId} onChange={(e) => setPatientId(Number(e.target.value) || 1)} style={{ ...field, width: 90 }} />
          <span className="muted" style={{ fontSize: ".8rem" }}>(demo IDs 1–3)</span>
        </div>
      )}
      <ErrorNote message={error} />

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3 className="card-title">Request a delivery</h3>
          <p className="card-sub">From your active prescriptions</p>
          <label className="field"><span>Medication</span>
            <select value={medId} onChange={(e) => setMedId(e.target.value)} style={field}>
              {meds.length === 0 && <option value="">No active medications</option>}
              {meds.map((m) => <option key={m.id} value={m.id}>{m.name}{m.dosage ? ` (${m.dosage})` : ""}</option>)}
            </select>
          </label>
          <label className="field"><span>Pharmacy</span>
            <select value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} style={field}>
              {PHARMACIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="field"><span>Delivery address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Villa 12, Jumeirah 1, Dubai" style={field} />
          </label>
          <button className="btn" style={{ marginTop: 6 }} onClick={request} disabled={busy || meds.length === 0}>
            {busy ? "Requesting…" : "🚚 Request delivery"}
          </button>
        </div>

        <div className="card">
          <h3 className="card-title">Your deliveries</h3>
          <p className="card-sub">Live status &amp; tracking</p>
          {deliveries.length === 0 ? (
            <EmptyState icon="📦" title="No deliveries yet" hint="Request one on the left, or from Medications." />
          ) : deliveries.map((d) => (
            <div key={d.id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
              <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{d.medication_name}</div>
                  <div className="muted" style={{ fontSize: ".82rem" }}>🏥 {d.pharmacy} · 🔖 {d.tracking_code}</div>
                  {d.address && <div className="muted" style={{ fontSize: ".8rem" }}>📍 {d.address}</div>}
                </div>
                <span className="badge" style={{ background: "var(--surface2, #eef2f7)" }}>{d.status === "delivered" ? "Delivered" : d.eta}</span>
              </div>
              <Tracker status={d.status} />
              {d.status !== "delivered" && d.status !== "cancelled" && (
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn ghost sm" onClick={() => advance(d.id)} title="Simulate the courier moving to the next stage">Advance status ▸</button>
                  <button className="btn danger sm" onClick={() => cancel(d.id)}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
