import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { api } from "../api/client.js";
import { ErrorNote, EmptyState } from "../components/ui.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";

const RISK_COLORS = ["#22c55e", "#ef4444"];

function riskLevel(rate) {
  if (rate < 0.7) return { color: "var(--danger)", label: "High risk" };
  if (rate < 0.85) return { color: "var(--warning)", label: "Watch" };
  return { color: "var(--success)", label: "Stable" };
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [patients, setPatients] = useState([]);
  const [population, setPopulation] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailTab, setDetailTab] = useState("summary");
  const [notes, setNotes] = useLocalStorage(
    `sanadi_notes_${user.id}_${selectedPatient?.id ?? "none"}`,
    ""
  );

  useEffect(() => {
    Promise.all([api.allPatients(), api.population(), api.appointmentQueue(14).catch(() => [])])
      .then(([p, pop, q]) => { setPatients(p); setPopulation(pop); setQueue(q); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function selectPatient(patient) {
    setSelectedPatient(patient);
    setDetailTab("summary");
    setSummary({ patient });
    setSummaryLoading(true);
    try {
      const res = await api.aiSummary(patient.id);
      setSummary({ patient, text: res.summary });
    } catch (e) {
      setSummary({ patient, text: `⚠️ ${e.message}` });
    } finally {
      setSummaryLoading(false);
    }
  }

  const gridColor = isDark ? "#253352" : "#e2e8f0";
  const adherenceChartData = patients.map((p) => ({ name: p.name.split(" ")[0], adherence: Math.round(p.adherence_rate * 100) }));
  const riskData = population
    ? [
        { name: "Healthy", value: population.total_patients - population.high_risk_patients.length },
        { name: "High-risk", value: population.high_risk_patients.length },
      ]
    : [];
  const filteredPatients = useMemo(
    () => patients.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())),
    [patients, query]
  );
  const patientQueue = selectedPatient ? queue.filter((a) => a.patient_id === selectedPatient.id) : [];

  if (loading) {
    return (
      <div className="grid" style={{ gap: 22 }}>
        <div className="page-head"><h1>Provider Portal</h1></div>
        <SkeletonList />
      </div>
    );
  }

  return (
    <div className="clinical-shell">
      {/* LEFT: patient roster + KPIs + queue */}
      <div className="clinical-rail">
        {population && (
          <div className="kpi-strip">
            <div><strong>{population.total_patients}</strong><span>Patients</span></div>
            <div><strong>{Math.round(population.avg_adherence * 100)}%</strong><span>Avg adherence</span></div>
            <div style={{ color: "var(--danger)" }}><strong>{population.high_risk_patients.length}</strong><span>High-risk</span></div>
          </div>
        )}

        <ErrorNote message={error} />

        <input
          className="clinical-search"
          placeholder="🔍 Search patients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="clinical-list">
          {filteredPatients.length === 0 ? (
            <EmptyState icon="👥" title="No patients found" />
          ) : filteredPatients.map((p) => {
            const risk = riskLevel(p.adherence_rate);
            const active = selectedPatient?.id === p.id;
            return (
              <button
                key={p.id}
                className={"clinical-list-item" + (active ? " active" : "")}
                onClick={() => selectPatient(p)}
              >
                <span className="risk-dot" style={{ background: risk.color }} title={risk.label} />
                <span className="clinical-list-info">
                  <span className="clinical-list-name">{p.name}</span>
                  <span className="clinical-list-sub">{p.conditions || "No conditions recorded"}</span>
                </span>
                <span className="clinical-list-pct">{Math.round(p.adherence_rate * 100)}%</span>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ marginTop: 4 }}>
          <h3 className="card-title" style={{ fontSize: ".95rem" }}>📅 Appointment queue</h3>
          <p className="card-sub" style={{ fontSize: ".8rem" }}>Next 14 days</p>
          {queue.length === 0 ? (
            <EmptyState icon="📅" title="Nothing scheduled" />
          ) : (
            queue.slice(0, 6).map((a) => (
              <div className="queue-row" key={a.id}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".85rem" }}>{a.patient_name}</div>
                  <div className="muted" style={{ fontSize: ".76rem" }}>{a.department}</div>
                </div>
                <span className="muted" style={{ fontSize: ".76rem" }}>
                  {new Date(a.scheduled_for).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: detail pane — selected patient, or population view */}
      <div className="clinical-detail">
        <AnimatePresence mode="wait">
          {!selectedPatient ? (
            <motion.div key="population" className="grid" style={{ gap: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="page-head" style={{ marginBottom: 0 }}>
                <h1>👨‍⚕️ Clinical Command Center</h1>
                <p>Select a patient on the left for their AI summary and notes, or review population risk here.</p>
              </div>

              <div className="grid cols-2">
                <div className="card">
                  <h3 className="card-title">Adherence by patient</h3>
                  <p className="card-sub">Medication adherence rate</p>
                  {adherenceChartData.length === 0 ? <EmptyState icon="📊" title="No patients yet" /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={adherenceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={gridColor} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke={gridColor} />
                        <Tooltip formatter={(v) => [`${v}%`, "Adherence"]} contentStyle={{ borderRadius: 12, border: "none" }} />
                        <Bar dataKey="adherence" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="card">
                  <h3 className="card-title">Population risk</h3>
                  <p className="card-sub">Adherence-based risk distribution</p>
                  {riskData.length === 0 ? <EmptyState icon="🥧" title="No data yet" /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                          {riskData.map((_, i) => <Cell key={i} fill={RISK_COLORS[i]} />)}
                        </Pie>
                        <Legend />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {population?.high_risk_patients?.length > 0 && (
                <div className="card" style={{ background: "var(--danger-100)", borderColor: "var(--danger)" }}>
                  <h3 className="card-title">⚠️ High-risk patients (adherence &lt; 70%)</h3>
                  {population.high_risk_patients.map((p) => (
                    <div className="list-row" key={p.id}>
                      <div className="lead"><div className="dot">🚩</div><div style={{ fontWeight: 700 }}>{p.name}</div></div>
                      <span className="badge red">{Math.round(p.adherence_rate * 100)}% · {p.missed_doses} missed</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key={selectedPatient.id} className="grid" style={{ gap: 20 }} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ marginBottom: 2 }}>{selectedPatient.name}</h1>
                  <p className="muted" style={{ margin: 0 }}>{selectedPatient.conditions || "No conditions recorded"}</p>
                </div>
                <button className="btn ghost sm" onClick={() => setSelectedPatient(null)}>← Back to overview</button>
              </div>

              <div className="tabs">
                <button className={"tab" + (detailTab === "summary" ? " active" : "")} onClick={() => setDetailTab("summary")}>🧠 AI Summary</button>
                <button className={"tab" + (detailTab === "notes" ? " active" : "")} onClick={() => setDetailTab("notes")}>📝 Clinical Notes</button>
                <button className={"tab" + (detailTab === "schedule" ? " active" : "")} onClick={() => setDetailTab("schedule")}>📅 Schedule</button>
              </div>

              {detailTab === "summary" && (
                <div className="card">
                  <p className="card-sub" style={{ marginTop: 0 }}>Generated by the Clinical agent</p>
                  {summaryLoading ? (
                    <div className="pulse muted">🧠 Generating summary…</div>
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{summary?.text}</div>
                  )}
                </div>
              )}

              {detailTab === "notes" && (
                <div className="card">
                  <p className="card-sub" style={{ marginTop: 0 }}>Private notes — saved on this device</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Type clinical notes here…"
                    style={{ minHeight: 220, resize: "vertical" }}
                  />
                </div>
              )}

              {detailTab === "schedule" && (
                <div className="card">
                  <p className="card-sub" style={{ marginTop: 0 }}>Upcoming visits for {selectedPatient.name}</p>
                  {patientQueue.length === 0 ? (
                    <EmptyState icon="📅" title="No upcoming appointments" />
                  ) : (
                    patientQueue.map((a) => (
                      <div className="list-row" key={a.id}>
                        <div className="lead"><div className="dot">🏥</div><div>{a.department} {a.reason ? `— ${a.reason}` : ""}</div></div>
                        <span className="badge">{new Date(a.scheduled_for).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
