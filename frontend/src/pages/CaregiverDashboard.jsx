import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import { StatCard, ErrorNote, EmptyState } from "../components/ui.jsx";
import { SkeletonStatGrid, SkeletonList } from "../components/Skeleton.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import { ReminderList } from "../components/CareTools.jsx";

const SCOPES = ["medications", "appointments", "symptoms", "safety"];

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const caregiverId = user.id;
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
      toast.success("Access granted — patient overview loaded");
    } catch (e) { setError(e.message); toast.error(e.message); }
    finally { setLinking(false); }
  }

  const initials = overview ? overview.patient.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const apptDates = overview?.upcoming_appointments?.map((a) => a.when) || [];
  const urgentCount = notifs.filter((n) => n.urgent).length;

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>👨‍👩‍👧 Caregiver Portal</h1>
        <p>Support a loved one — you only see what the patient permits.</p>
      </div>

      <ErrorNote message={error} />

      <div className="card">
        <h3 className="card-title">Connect to a patient</h3>
        <p className="card-sub">Enter the patient's ID and the access they've granted you (demo patient ID: 1 or 2)</p>
        <label className="field" style={{ maxWidth: 220 }}>
          <span>Patient ID</span>
          <input type="number" min="1" value={patientId} onChange={(e) => setPatientId(Number(e.target.value) || 1)} />
        </label>
        <div className="row wrap">
          {SCOPES.map((s) => (
            <label key={s} className="badge gray" style={{ padding: "8px 14px", cursor: "pointer" }}>
              <input type="checkbox" checked={grants[s]} onChange={() => setGrants({ ...grants, [s]: !grants[s] })} style={{ width: "auto", marginRight: 6 }} />
              {s}
            </label>
          ))}
          <button className="btn" onClick={link} disabled={linking}>{linking ? "Linking…" : "Grant & view"}</button>
        </div>
      </div>

      {loading ? (
        <><SkeletonStatGrid count={3} /><SkeletonList /></>
      ) : !overview ? (
        <EmptyState icon="🔒" title="No access yet" hint="Grant scopes above to view the patient overview." />
      ) : (
        <>
          <motion.div
            className="patient-hero-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.2rem" }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "1.15rem", fontFamily: "var(--font-display)" }}>{overview.patient.name}</div>
              <div className="muted" style={{ fontSize: ".85rem" }}>Patient ID #{patientId} · You have {SCOPES.filter((s) => grants[s]).length} access scopes</div>
            </div>
            {urgentCount > 0 && <span className="badge red">🚨 {urgentCount} urgent alert{urgentCount > 1 ? "s" : ""}</span>}
          </motion.div>

          <div className="grid cols-3">
            {"adherence_rate" in overview && (
              <StatCard icon="✅" value={`${Math.round(overview.adherence_rate * 100)}%`} label="Adherence" accent="#22c55e" />
            )}
            {"missed_doses" in overview && (
              <StatCard icon="⚠️" value={overview.missed_doses} label="Missed doses" accent="#f59e0b" />
            )}
            {"upcoming_appointments" in overview && (
              <StatCard icon="📅" value={overview.upcoming_appointments.length} label="Upcoming visits" accent="#6366f1" />
            )}
          </div>

          <div className="grid cols-2">
            <div className="card">
              <h3 className="card-title">📅 Appointment calendar</h3>
              <p className="card-sub">Highlighted days have a scheduled visit</p>
              <MiniCalendar highlightDates={apptDates} />
            </div>

            <div className="card">
              <h3 className="card-title">📍 Patient location</h3>
              <p className="card-sub">Live location sharing</p>
              <div className="location-placeholder">
                <span style={{ fontSize: "2rem" }}>🗺️</span>
                <div className="muted" style={{ fontSize: ".85rem", marginTop: 6 }}>Location sharing isn't enabled yet</div>
              </div>
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

          <div className="card">
            <h3 className="card-title">🗓️ Daily routine tracker</h3>
            <p className="card-sub">Shared reminders for this patient's routine</p>
            <ReminderList storageKey={`sanadi_caregiver_routine_${patientId}`} placeholder="e.g. Morning walk, breakfast, medication check" />
          </div>
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
