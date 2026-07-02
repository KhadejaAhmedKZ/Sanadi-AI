import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { api } from "../api/client.js";
import { StatCard, ErrorNote, EmptyState } from "../components/ui.jsx";
import { SkeletonStatGrid, SkeletonList } from "../components/Skeleton.jsx";
import Table from "../components/Table.jsx";

const RISK_COLORS = ["#22c55e", "#ef4444"];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [patients, setPatients] = useState([]);
  const [population, setPopulation] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
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

  async function genSummary(patient) {
    setSelectedPatient(patient);
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

  if (loading) {
    return (
      <div className="grid" style={{ gap: 22 }}>
        <div className="page-head"><h1>Provider Portal</h1></div>
        <SkeletonStatGrid />
        <SkeletonList />
      </div>
    );
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>👨‍⚕️ Provider Portal</h1>
        <p>Clinical intelligence — patient overviews, AI pre-visit summaries, and population risk.</p>
      </div>

      <ErrorNote message={error} />

      {population && (
        <div className="grid cols-3">
          <StatCard icon="👥" value={population.total_patients} label="Total patients" accent="#2563eb" />
          <StatCard icon="✅" value={`${Math.round(population.avg_adherence * 100)}%`} label="Avg adherence" accent="#22c55e" />
          <StatCard icon="⚠️" value={population.high_risk_patients.length} label="High-risk patients" accent="#ef4444" />
        </div>
      )}

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

      <div className="card">
        <h3 className="card-title">Patient list</h3>
        <p className="card-sub">Click a row for an AI pre-visit summary</p>
        {patients.length === 0 ? (
          <EmptyState icon="👥" title="No patients" />
        ) : (
          <Table
            rowKey="id"
            onRowClick={genSummary}
            columns={[
              { key: "name", label: "Patient" },
              { key: "conditions", label: "Conditions", sortable: false, render: (p) => p.conditions || "—" },
              {
                key: "adherence_rate", label: "Adherence",
                render: (p) => (
                  <span className={"badge " + (p.adherence_rate < 0.7 ? "red" : "green")}>
                    {Math.round(p.adherence_rate * 100)}%
                  </span>
                ),
              },
            ]}
            rows={patients}
          />
        )}
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-title">🧠 AI pre-visit summary</h3>
          <p className="card-sub">Generated by the Clinical agent</p>
          {!summary ? (
            <EmptyState icon="📄" title="No summary yet" hint="Click a patient row above." />
          ) : (
            <>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{summary.patient.name}</div>
              {summaryLoading ? (
                <div className="pulse muted">🧠 Generating summary…</div>
              ) : (
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{summary.text}</div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">📝 Clinical notes</h3>
          <p className="card-sub">
            {selectedPatient ? `Private notes for ${selectedPatient.name}` : "Select a patient to add notes"}
          </p>
          <textarea
            disabled={!selectedPatient}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={selectedPatient ? "Type clinical notes here — saved automatically…" : "Select a patient first"}
            style={{ minHeight: 140, resize: "vertical" }}
          />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">📅 Appointment queue</h3>
        <p className="card-sub">Scheduled visits in the next 14 days</p>
        {queue.length === 0 ? (
          <EmptyState icon="📅" title="No upcoming appointments" />
        ) : (
          queue.map((a) => (
            <div className="list-row" key={a.id}>
              <div className="lead">
                <div className="dot">🏥</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.patient_name}</div>
                  <div className="muted" style={{ fontSize: ".82rem" }}>{a.department} {a.reason ? `— ${a.reason}` : ""}</div>
                </div>
              </div>
              <span className="badge">{new Date(a.scheduled_for).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
          ))
        )}
      </div>

      {population?.high_risk_patients?.length > 0 && (
        <motion.div className="card" style={{ background: "var(--danger-100)", borderColor: "var(--danger)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="card-title">⚠️ High-risk patients (adherence &lt; 70%)</h3>
          {population.high_risk_patients.map((p) => (
            <div className="list-row" key={p.id}>
              <div className="lead"><div className="dot">🚩</div><div style={{ fontWeight: 700 }}>{p.name}</div></div>
              <span className="badge red">{Math.round(p.adherence_rate * 100)}% · {p.missed_doses} missed</span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
