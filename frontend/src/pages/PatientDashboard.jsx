import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { StatCard, EmptyState, ErrorNote } from "../components/ui.jsx";
import { SkeletonStatGrid, SkeletonList } from "../components/Skeleton.jsx";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const patientId = user.id;

  async function load() {
    setLoading(true);
    try {
      setDash(await api.dashboard(patientId));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [patientId]);

  if (error) return <ErrorNote message={error} />;

  const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  if (loading || !dash) {
    return (
      <div className="grid" style={{ gap: 22 }}>
        <div className="page-head"><h1>My Health</h1></div>
        <SkeletonStatGrid />
        <div className="grid cols-2"><SkeletonList /><SkeletonList /></div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>{dash.patient.name}'s Health</h1>
        <p>{dash.patient.conditions || "No conditions on record"}</p>
      </div>

      <div className="grid cols-4">
        <StatCard icon="💊" value={dash.medications.length} label="Active medications" accent="#2563eb" />
        <StatCard icon="✅" value={`${Math.round(dash.adherence_rate * 100)}%`} label="Adherence" accent="#22c55e" />
        <StatCard icon="📅" value={dash.appointments.length} label="Upcoming visits" accent="#6366f1" />
        <StatCard icon="🩺" value={dash.recent_symptoms.length} label="Symptom logs" accent="#f59e0b" />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-title">💊 Medications</h3>
          <p className="card-sub">Your current prescriptions</p>
          {dash.medications.length === 0 ? (
            <EmptyState icon="💊" title="No medications yet" />
          ) : (
            dash.medications.map((m) => (
              <div className="list-row" key={m.id}>
                <div className="lead">
                  <div className="dot">💊</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.name}</div>
                    <div className="muted" style={{ fontSize: ".85rem" }}>{m.dosage} · {m.schedule || "as needed"}</div>
                  </div>
                </div>
                <span className="badge green">Active</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 className="card-title">📅 Upcoming appointments</h3>
          <p className="card-sub">Your scheduled visits</p>
          {dash.appointments.length === 0 ? (
            <EmptyState icon="📅" title="No upcoming appointments" />
          ) : (
            dash.appointments.map((a) => (
              <div className="list-row" key={a.id}>
                <div className="lead">
                  <div className="dot">🏥</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.department}</div>
                    <div className="muted" style={{ fontSize: ".85rem" }}>{a.reason || "General visit"}</div>
                  </div>
                </div>
                <span className="badge">{fmt(a.scheduled_for)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🩺 Recent symptoms</h3>
        <p className="card-sub">Tracked check-ins and pain levels</p>
        {dash.recent_symptoms.length === 0 ? (
          <EmptyState icon="🩺" title="No symptoms logged" hint="Log symptoms from the AI Assistant or Medications page." />
        ) : (
          dash.recent_symptoms.map((s) => (
            <div className="list-row" key={s.id}>
              <div className="lead">
                <div className="dot">📝</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.description}</div>
                  <div className="muted" style={{ fontSize: ".8rem" }}>{fmt(s.logged_at)}</div>
                </div>
              </div>
              {s.pain_level != null && (
                <span className={"badge " + (s.pain_level >= 7 ? "red" : s.pain_level >= 4 ? "amber" : "green")}>
                  Pain {s.pain_level}/10
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
