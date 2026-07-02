import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import { StatCard, ErrorNote, EmptyState } from "../components/ui.jsx";
import { SkeletonStatGrid, SkeletonList } from "../components/Skeleton.jsx";
import MiniCalendar from "../components/MiniCalendar.jsx";
import Markdown from "../components/Markdown.jsx";
import { ReminderList } from "../components/CareTools.jsx";

const SCOPES = ["medications", "appointments", "symptoms", "safety"];
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "alerts", label: "Alerts" },
  { id: "understand", label: "🧠 Understand" },
  { id: "calendar", label: "Calendar & Routine" },
];
const POLL_MS = 20000; // live alert polling

function statusFromOverview(overview, urgentCount) {
  if (!overview) return { level: "unknown", label: "No data", color: "var(--muted)" };
  if (urgentCount > 0) return { level: "critical", label: "Needs attention", color: "var(--danger)" };
  const lowAdherence = "adherence_rate" in overview && overview.adherence_rate < 0.7;
  const missedDoses = "missed_doses" in overview && overview.missed_doses > 2;
  if (lowAdherence || missedDoses) return { level: "watch", label: "Keep an eye on this", color: "var(--warning)" };
  return { level: "stable", label: "Doing well", color: "var(--success)" };
}

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const caregiverId = user.id;
  const [patientId, setPatientId] = useState(1);
  const [manageOpen, setManageOpen] = useState(false);
  const [tab, setTab] = useState("overview");

  const [overview, setOverview] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [grants, setGrants] = useState({ medications: true, appointments: true, symptoms: true, safety: true });
  const [linking, setLinking] = useState(false);

  // Escalation (urgent review request)
  const [escOpen, setEscOpen] = useState(false);
  const [escReason, setEscReason] = useState("");
  const [escSending, setEscSending] = useState(false);

  // AI education guide
  const [guide, setGuide] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState("");

  const knownIdsRef = useRef(null); // notification ids seen so far, for "new alert" toasts

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
      knownIdsRef.current = new Set(nt.map((n) => n.id));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadOverview(); }, [patientId]);

  // Live alerts: poll notifications so safety events appear while you watch.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const nt = await api.caregiverNotifications(caregiverId);
        const known = knownIdsRef.current;
        if (known) {
          const fresh = nt.filter((n) => !known.has(n.id));
          const freshUrgent = fresh.find((n) => n.urgent);
          if (freshUrgent) toast.error(`🚨 ${freshUrgent.title}`);
          else if (fresh.length) toast.info?.(fresh[0].title);
        }
        knownIdsRef.current = new Set(nt.map((n) => n.id));
        setNotifs(nt);
      } catch { /* transient network issue — next poll retries */ }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [caregiverId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendEscalation() {
    const reason = escReason.trim();
    if (!reason) return;
    setEscSending(true);
    try {
      await api.raiseEscalation({ caregiver_id: caregiverId, patient_id: patientId, reason });
      setEscOpen(false);
      setEscReason("");
      toast.success("Sent — the care team has been notified and will review urgently");
    } catch (e) { toast.error(e.message); }
    finally { setEscSending(false); }
  }

  // Load the AI guide when the Understand tab opens (cached per patient per day).
  useEffect(() => {
    if (tab !== "understand" || !overview || guide || guideLoading) return;
    const cacheKey = `sanadi_edu_${patientId}_${new Date().toDateString()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setGuide(cached); return; }
    setGuideLoading(true);
    setGuideError("");
    api.caregiverEducation(caregiverId, patientId)
      .then((res) => {
        setGuide(res.guide);
        try { localStorage.setItem(cacheKey, res.guide); } catch { /* full */ }
      })
      .catch((e) => setGuideError(e.message))
      .finally(() => setGuideLoading(false));
  }, [tab, overview]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset per-patient AI state when switching patients.
  useEffect(() => { setGuide(""); setGuideError(""); setEscOpen(false); }, [patientId]);

  async function link() {
    setLinking(true);
    setError("");
    try {
      const scopes = SCOPES.filter((s) => grants[s]);
      await api.linkCaregiver({ caregiver_id: caregiverId, patient_id: patientId, scopes });
      await loadOverview();
      setManageOpen(false);
      toast.success("Access granted — patient overview loaded");
    } catch (e) { setError(e.message); toast.error(e.message); }
    finally { setLinking(false); }
  }

  const initials = overview ? overview.patient.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const apptDates = overview?.upcoming_appointments?.map((a) => a.when) || [];
  const urgentCount = notifs.filter((n) => n.urgent).length;
  const status = statusFromOverview(overview, urgentCount);

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="care-hub-header">
        <div className="row" style={{ gap: 14 }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: "1.15rem", background: "var(--gradient-secondary)" }}>
            {initials}
          </div>
          <div>
            <div className="muted" style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>
              Caring for
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.3rem", fontFamily: "var(--font-display)" }}>
              {overview ? overview.patient.name : `Patient #${patientId}`}
            </div>
          </div>
          <span className="status-pulse" style={{ "--pulse-color": status.color }}>
            <span className="status-pulse-dot" /> {status.label}
          </span>
        </div>
        <button className="btn secondary sm" onClick={() => setManageOpen((o) => !o)}>
          {manageOpen ? "✕ Close" : "⚙️ Switch patient / access"}
        </button>
      </div>

      <AnimatePresence>
        {manageOpen && (
          <motion.div
            className="card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <h3 className="card-title">Connect to a patient</h3>
            <p className="card-sub">Enter the patient's ID and the access they've granted you (demo patient IDs: 1, 2 or 3)</p>
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
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorNote message={error} />

      {loading ? (
        <><SkeletonStatGrid count={3} /><SkeletonList /></>
      ) : !overview ? (
        <EmptyState icon="🔒" title="No access yet" hint="Use 'Switch patient / access' above to connect." />
      ) : (
        <>
          {urgentCount > 0 && (
            <motion.div
              className="card"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: "var(--danger-100)", borderColor: "var(--danger)" }}
            >
              <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
                <div className="lead" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="dot" style={{ fontSize: "1.4rem" }}>🚨</div>
                  <div>
                    <div style={{ fontWeight: 800 }}>{notifs.find((n) => n.urgent)?.title}</div>
                    <div className="muted" style={{ fontSize: ".85rem" }}>
                      {notifs.find((n) => n.urgent)?.body}
                    </div>
                  </div>
                </div>
                <button
                  className="btn danger sm"
                  onClick={() => {
                    setEscReason(notifs.find((n) => n.urgent)?.title || "");
                    setEscOpen(true);
                  }}
                >
                  🚑 Request urgent review
                </button>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {escOpen && (
              <motion.div
                className="card"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <h3 className="card-title">🚑 Request urgent review</h3>
                <p className="card-sub">
                  This goes straight to the top of the care team's queue. Dr. will see it immediately
                  and you'll be notified when it's reviewed.
                </p>
                <textarea
                  value={escReason}
                  onChange={(e) => setEscReason(e.target.value)}
                  placeholder={`Describe what's worrying you about ${overview.patient.name}…`}
                  maxLength={400}
                  style={{ minHeight: 90, resize: "vertical" }}
                />
                <div className="row" style={{ marginTop: 10, gap: 10 }}>
                  <button className="btn danger" onClick={sendEscalation} disabled={escSending || !escReason.trim()}>
                    {escSending ? "Sending…" : "Send to care team"}
                  </button>
                  <button className="btn ghost" onClick={() => setEscOpen(false)}>Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={"tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
                {t.label}
                {t.id === "alerts" && urgentCount > 0 && <span className="badge red" style={{ marginLeft: 8 }}>{urgentCount}</span>}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <motion.div className="grid" style={{ gap: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="grid cols-3">
                {"adherence_rate" in overview && (
                  <StatCard icon="✅" value={`${Math.round(overview.adherence_rate * 100)}%`} label="Adherence" accent="#14b8a6" />
                )}
                {"missed_doses" in overview && (
                  <StatCard icon="⚠️" value={overview.missed_doses} label="Missed doses" accent="#f59e0b" />
                )}
                {"upcoming_appointments" in overview && (
                  <StatCard icon="📅" value={overview.upcoming_appointments.length} label="Upcoming visits" accent="#06b6d4" />
                )}
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
            </motion.div>
          )}

          {tab === "alerts" && (
            <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 className="card-title">🔔 Safety alerts</h3>
                  <p className="card-sub">Live — checks for new alerts every 20 seconds</p>
                </div>
                <button className="btn danger sm" onClick={() => setEscOpen(true)}>
                  🚑 Request urgent review
                </button>
              </div>
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
            </motion.div>
          )}

          {tab === "understand" && (
            <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 className="card-title">🧠 Understanding {overview.patient.name.split(" ")[0]}'s condition</h3>
                  <p className="card-sub">
                    What's normal, what to know, and when to actually worry — written for you, not for doctors
                  </p>
                </div>
                <button
                  className="btn ghost sm"
                  disabled={guideLoading}
                  onClick={() => {
                    localStorage.removeItem(`sanadi_edu_${patientId}_${new Date().toDateString()}`);
                    setGuide("");
                    setGuideError("");
                  }}
                >
                  ↻ Refresh
                </button>
              </div>
              {guideLoading ? (
                <div className="pulse muted" style={{ padding: "18px 0" }}>
                  🧠 Writing a guide based on {overview.patient.name.split(" ")[0]}'s condition and recent symptoms…
                </div>
              ) : guideError ? (
                <ErrorNote message={guideError} />
              ) : guide ? (
                <div style={{ lineHeight: 1.65 }}><Markdown text={guide} /></div>
              ) : null}
            </motion.div>
          )}

          {tab === "calendar" && (
            <motion.div className="grid" style={{ gap: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
              <div className="card">
                <h3 className="card-title">🗓️ Daily routine tracker</h3>
                <p className="card-sub">Shared reminders for this patient's routine</p>
                <ReminderList storageKey={`sanadi_caregiver_routine_${patientId}`} placeholder="e.g. Morning walk, breakfast, medication check" />
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
