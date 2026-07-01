import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { StatCard, Loader, ErrorNote, EmptyState } from "../components/ui.jsx";

const SCOPES = ["medications", "appointments", "symptoms", "safety"];

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const caregiverId = user.id; // the logged-in caregiver
  // The patient this caregiver supports (by their patient ID). Demo default: 1.
  const [patientId, setPatientId] = useState(1);

  const [overview, setOverview] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [grants, setGrants] = useState({ medications: true, appointments: true, symptoms: true, safety: true });
  const [linking, setLinking] = useState(false);

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const [ov, nt] = await Promise.all([
        api.caregiverOverview(caregiverId, patientId).catch(() => null),
        api.caregiverNotifications(caregiverId).catch(() => []),
      ]);
      setOverview(ov);
      setNotifs(nt);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadOverview(); }, [patientId]);

  async function link() {
    setLinking(true);
    setError("");
    try {
      const scopes = SCOPES.filter((s) => grants[s]);
      await api.linkCaregiver({ caregiver_id: caregiverId, patient_id: patientId, scopes });
      await loadOverview();
    } catch (e) { setError(e.message); }
    finally { setLinking(false); }
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>👨‍👩‍👧 Caregiver Portal</h1>
        <p>Support a loved one — you only see what the patient permits.</p>
      </div>

      <ErrorNote message={error} />

      <div className="card">
        <h3 className="card-title">Connect to a patient</h3>
        <p className="card-sub">
          Enter the patient's ID and the access they've granted you (demo patient ID: 1 or 2)
        </p>
        <label className="field" style={{ maxWidth: 220 }}>
          <span>Patient ID</span>
          <input
            type="number"
            min="1"
            value={patientId}
            onChange={(e) => setPatientId(Number(e.target.value) || 1)}
          />
        </label>
        <div className="row wrap">
          {SCOPES.map((s) => (
            <label key={s} className="badge gray" style={{ padding: "8px 14px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={grants[s]}
                onChange={() => setGrants({ ...grants, [s]: !grants[s] })}
                style={{ width: "auto", marginRight: 6 }}
              />
              {s}
            </label>
          ))}
          <button className="btn" onClick={link} disabled={linking}>
            {linking ? "Linking…" : "Grant & view"}
          </button>
        </div>
      </div>

      {loading ? <Loader /> : !overview ? (
        <EmptyState icon="🔒" title="No access yet" hint="Grant scopes above to view the patient overview." />
      ) : (
        <>
          <div className="card">
            <h3 className="card-title">Patient: {overview.patient.name}</h3>
            <div className="grid cols-3 mt">
              {"adherence_rate" in overview && (
                <StatCard icon="✅" value={`${Math.round(overview.adherence_rate * 100)}%`} label="Adherence" accent="#10b981" />
              )}
              {"missed_doses" in overview && (
                <StatCard icon="⚠️" value={overview.missed_doses} label="Missed doses" accent="#f59e0b" />
              )}
              {"upcoming_appointments" in overview && (
                <StatCard icon="📅" value={overview.upcoming_appointments.length} label="Upcoming visits" accent="#6366f1" />
              )}
            </div>
          </div>

          {overview.recent_symptoms && (
            <div className="card">
              <h3 className="card-title">Recent symptoms</h3>
              {overview.recent_symptoms.length === 0 ? (
                <EmptyState icon="🩺" title="None recorded" />
              ) : overview.recent_symptoms.map((s, i) => (
                <div className="list-row" key={i}>
                  <div className="lead"><div className="dot">📝</div><div>{s.description}</div></div>
                  {s.pain_level != null && <span className="badge amber">Pain {s.pain_level}/10</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="card">
        <h3 className="card-title">🔔 Alerts</h3>
        <p className="card-sub">Safety notifications from the patient's account</p>
        {notifs.length === 0 ? (
          <EmptyState icon="🔕" title="No alerts" hint="Emergency events appear here." />
        ) : notifs.map((n) => (
          <div className="list-row" key={n.id}>
            <div className="lead">
              <div className="dot">{n.urgent ? "🚨" : "🔔"}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{n.title}</div>
                <div className="muted" style={{ fontSize: ".82rem" }}>{n.body}</div>
              </div>
            </div>
            {n.urgent && <span className="badge red">Urgent</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
