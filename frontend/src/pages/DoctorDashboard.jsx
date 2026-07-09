import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line, ScatterChart, Scatter, ZAxis, RadialBarChart, RadialBar, PolarAngleAxis, Area, AreaChart } from "recharts";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useVoice } from "../hooks/useVoice.js";
import { api } from "../api/client.js";
import Markdown from "../components/Markdown.jsx";
import VideoVisit from "../components/VideoVisit.jsx";
import BodyFigure, { intensityColor } from "../components/BodyFigure.jsx";
import { ErrorNote, EmptyState } from "../components/ui.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";

const RISK_COLORS = ["#22c55e", "#ef4444"];
const POLL_MS = 20000;

const RISK_STYLES = {
  high: { color: "var(--danger)", label: "High risk" },
  watch: { color: "var(--warning)", label: "Watch" },
  stable: { color: "var(--success)", label: "Stable" },
};

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
  const toast = useToast();
  const [escalations, setEscalations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [labs, setLabs] = useState([]);
  const [labForm, setLabForm] = useState({ test_name: "", value: "", unit: "", reference_range: "", status: "normal" });
  const [labSaving, setLabSaving] = useState(false);
  const [activeVisit, setActiveVisit] = useState(null);
  const [bodyMap, setBodyMap] = useState({ latest: {}, history: [] });
  const [bodySide, setBodySide] = useState("front");
  const [bodySex, setBodySex] = useState("female");
  const [bodyRegion, setBodyRegion] = useState(null);
  const [market, setMarket] = useState({ bookings: [], deliveries: [] });
  const location = useLocation();
  const navigate = useNavigate();

  // Voice dictation for clinical notes (appends each finished phrase).
  const voice = useVoice({
    onResult: (t) => setNotes((n) => (n ? n.trimEnd() + " " : "") + t.trim()),
  });

  useEffect(() => {
    Promise.all([
      api.allPatients(),
      api.population(),
      api.appointmentQueue(14).catch(() => []),
      api.providerEscalations().catch(() => []),
    ])
      .then(([p, pop, q, esc]) => { setPatients(p); setPopulation(pop); setQueue(q); setEscalations(esc); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Live triage: new caregiver escalations appear while the portal is open.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const esc = await api.providerEscalations();
        setEscalations((prev) => {
          const prevIds = new Set(prev.map((e) => e.id));
          const fresh = esc.find((e) => !prevIds.has(e.id) && e.status === "open");
          if (fresh) toast.error(`🚨 Urgent review requested for ${fresh.patient_name}`);
          return esc;
        });
        // Escalations change risk scores — keep the triage ranking current.
        setPatients(await api.allPatients());
      } catch { /* transient — next poll retries */ }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function selectPatient(patient) {
    setSelectedPatient(patient);
    setDetailTab("summary");
    setSummary({ patient });
    setSummaryLoading(true);
    setInsights(null);
    setAnalytics(null);
    setLabs([]);
    api.patientAnalytics(patient.id).then(setAnalytics).catch(() => setAnalytics(null));
    api.labs(patient.id).then(setLabs).catch(() => setLabs([]));
    setBodyRegion(null);
    api.bodyAssessments(patient.id).then(setBodyMap).catch(() => setBodyMap({ latest: {}, history: [] }));
    setMarket({ bookings: [], deliveries: [] });
    api.bookings(patient.id).then((bookings) => setMarket((m) => ({ ...m, bookings }))).catch(() => {});
    api.deliveries(patient.id).then((deliveries) => setMarket((m) => ({ ...m, deliveries }))).catch(() => {});
    try {
      const res = await api.aiSummary(patient.id);
      setSummary({ patient, text: res.summary });
    } catch (e) {
      setSummary({ patient, text: `⚠️ ${e.message}` });
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadInsights() {
    if (!selectedPatient) return;
    setInsightsLoading(true);
    try {
      const res = await api.caseInsights(selectedPatient.id);
      setInsights(res);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setInsightsLoading(false);
    }
  }

  async function saveLab(e) {
    e.preventDefault();
    if (!selectedPatient || !labForm.test_name.trim() || !labForm.value.trim()) return;
    setLabSaving(true);
    try {
      await api.addLab({ ...labForm, patient_id: selectedPatient.id, provider_id: user.id });
      setLabForm({ test_name: "", value: "", unit: "", reference_range: "", status: "normal" });
      setLabs(await api.labs(selectedPatient.id));
      toast.success("Result added — the patient can see it now");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLabSaving(false);
    }
  }

  async function handleEscalation(id, status) {
    try {
      await api.setEscalationStatus(id, status, user.id);
      setEscalations(await api.providerEscalations());
      setPatients(await api.allPatients());
      toast.success(status === "resolved" ? "Resolved — the Primary Carer has been notified" : "Acknowledged — Primary Carer notified you're on it");
    } catch (e) {
      toast.error(e.message);
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

  // Information architecture: the crowded overview is split into dedicated,
  // sidebar-accessible pages. All state/effects above are shared (this component
  // stays mounted across the sub-routes), so nothing about the logic changes.
  const path = location.pathname;
  const section = path.endsWith("/queue") ? "queue"
    : path.endsWith("/escalations") ? "escalations"
    : path.endsWith("/analytics") ? "analytics"
    : "workspace";
  const openEscalations = escalations.filter((e) => e.status !== "resolved");

  // ---------- Appointment Queue (own page) ----------
  if (section === "queue") {
    return (
      <div className="grid" style={{ gap: 22 }}>
        <div className="page-head"><h1>📅 Appointment Queue</h1><p>Upcoming visits across your panel — next 14 days.</p></div>
        <ErrorNote message={error} />
        <div className="card">
          {queue.length === 0 ? (
            <EmptyState icon="📅" title="Nothing scheduled" />
          ) : queue.map((a) => (
            <div className="list-row" key={a.id}>
              <div className="lead">
                <div className="dot">{a.is_video ? "📹" : "🏥"}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.patient_name}</div>
                  <div className="muted" style={{ fontSize: ".8rem" }}>{a.department}{a.reason ? ` — ${a.reason}` : ""}</div>
                </div>
              </div>
              <span className="badge">{new Date(a.scheduled_for).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Urgent Reviews / Escalations (own page) ----------
  if (section === "escalations") {
    return (
      <div className="grid" style={{ gap: 22 }}>
        <div className="page-head"><h1>🚨 Urgent Reviews</h1><p>Reviews requested by Primary Carers — acknowledge or mark reviewed.</p></div>
        <ErrorNote message={error} />
        <div className="card">
          {openEscalations.length === 0 ? (
            <EmptyState icon="✅" title="No urgent reviews" hint="Requests from Primary Carers appear here." />
          ) : openEscalations.map((e) => (
            <div className="list-row" key={e.id} style={{ alignItems: "flex-start" }}>
              <div className="lead" style={{ alignItems: "flex-start" }}>
                <div className="dot">🚑</div>
                <div>
                  <button
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "inherit", fontWeight: 800 }}
                    onClick={() => { const p = patients.find((x) => x.id === e.patient_id); if (p) { selectPatient(p); navigate("/provider"); } }}
                  >
                    {e.patient_name}
                  </button>
                  {e.status === "acknowledged" && <span className="badge" style={{ marginLeft: 6 }}>reviewing</span>}
                  <div className="muted" style={{ fontSize: ".82rem", marginTop: 2 }}>“{e.reason}” — {e.raised_by_name}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                {e.status === "open" && (
                  <button className="btn ghost sm" onClick={() => handleEscalation(e.id, "acknowledged")}>👀 Acknowledge</button>
                )}
                <button className="btn danger sm" onClick={() => handleEscalation(e.id, "resolved")}>✓ Mark reviewed</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Population Analytics (own page) ----------
  if (section === "analytics") {
    const riskLevelData = [
      { name: "Stable", value: patients.filter((p) => (p.risk_level || "stable") === "stable").length, fill: "#22c55e" },
      { name: "Watch", value: patients.filter((p) => p.risk_level === "watch").length, fill: "#f59e0b" },
      { name: "High", value: patients.filter((p) => p.risk_level === "high").length, fill: "#ef4444" },
    ];
    const LEVEL_FILL = { high: "#ef4444", watch: "#f59e0b", stable: "#22c55e" };
    const scatterData = patients.map((p) => ({
      adherence: Math.round((p.adherence_rate ?? 0) * 100),
      risk: p.risk_score ?? 0,
      name: p.name.split(" ")[0],
      fill: LEVEL_FILL[p.risk_level] || LEVEL_FILL.stable,
    }));
    const deptData = Object.values(
      queue.reduce((acc, a) => {
        const d = a.department || "General";
        acc[d] = acc[d] || { department: d, video: 0, "in-person": 0 };
        if (a.is_video) acc[d].video += 1; else acc[d]["in-person"] += 1;
        return acc;
      }, {})
    );
    return (
      <div className="grid" style={{ gap: 22 }}>
        <div className="page-head"><h1>📊 Population Analytics</h1><p>Panel-wide adherence and risk. Synthetic demo data.</p></div>
        <ErrorNote message={error} />
        {population && (
          <div className="kpi-strip">
            <div><strong>{population.total_patients}</strong><span>Patients</span></div>
            <div><strong>{Math.round(population.avg_adherence * 100)}%</strong><span>Avg adherence</span></div>
            <div style={{ color: "var(--danger)" }}><strong>{population.high_risk_patients.length}</strong><span>High-risk</span></div>
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
          <h3 className="card-title">Patients by risk level</h3>
          <p className="card-sub">How your panel breaks down across the triage bands</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskLevelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={gridColor} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={gridColor} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
              <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                {riskLevelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid cols-2">
          <div className="card">
            <h3 className="card-title">Adherence vs risk</h3>
            <p className="card-sub">Each dot is a patient — lower adherence tends to mean higher risk</p>
            {scatterData.length === 0 ? <EmptyState icon="🔬" title="No patients yet" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart margin={{ top: 10, right: 16, left: -18, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" dataKey="adherence" name="Adherence" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} stroke={gridColor} />
                  <YAxis type="number" dataKey="risk" name="Risk" domain={[0, 100]} tick={{ fontSize: 11 }} stroke={gridColor} />
                  <ZAxis range={[90, 90]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v, n) => [n === "Adherence" ? `${v}%` : v, n]} labelFormatter={() => ""} contentStyle={{ borderRadius: 12, border: "none" }} />
                  <Scatter data={scatterData}>
                    {scatterData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="card">
            <h3 className="card-title">Appointment load by department</h3>
            <p className="card-sub">Next 14 days — video vs in-person</p>
            {deptData.length === 0 ? <EmptyState icon="📅" title="Nothing scheduled" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke={gridColor} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={gridColor} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                  <Legend />
                  <Bar dataKey="video" stackId="a" fill="#2563eb" name="Video" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="in-person" stackId="a" fill="#14b8a6" name="In-person" radius={[6, 6, 0, 0]} />
                </BarChart>
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
      </div>
    );
  }

  return (
    <div className="clinical-shell">
      {/* LEFT: patient roster + KPIs + queue */}
      <div className="clinical-rail">
        {openEscalations.length > 0 && (
          <button
            className="card"
            onClick={() => navigate("/provider/escalations")}
            style={{ background: "var(--danger-100)", borderColor: "var(--danger)", padding: 12, cursor: "pointer", textAlign: "left", width: "100%" }}
          >
            <div style={{ fontWeight: 800, fontSize: ".85rem" }}>
              🚨 {openEscalations.length} urgent review{openEscalations.length > 1 ? "s" : ""} requested
            </div>
            <div className="muted" style={{ fontSize: ".76rem", marginTop: 2 }}>Tap to review →</div>
          </button>
        )}

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
          placeholder="🔍 Search patients (ranked by risk)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="clinical-list">
          {filteredPatients.length === 0 ? (
            <EmptyState icon="👥" title="No patients found" />
          ) : filteredPatients.map((p) => {
            const risk = RISK_STYLES[p.risk_level] || RISK_STYLES.stable;
            const active = selectedPatient?.id === p.id;
            const why = p.risk_reasons?.length ? `${risk.label}: ${p.risk_reasons.join(" · ")}` : risk.label;
            return (
              <button
                key={p.id}
                className={"clinical-list-item" + (active ? " active" : "")}
                onClick={() => selectPatient(p)}
                title={why}
              >
                <span className="risk-dot" style={{ background: risk.color }} />
                <span className="clinical-list-info">
                  <span className="clinical-list-name">{p.name}</span>
                  <span className="clinical-list-sub">
                    {p.risk_reasons?.length ? p.risk_reasons[0] : p.conditions || "No conditions recorded"}
                  </span>
                </span>
                <span className="clinical-list-pct" style={p.risk_score >= 50 ? { color: "var(--danger)" } : undefined}>
                  {p.risk_score > 0 ? `⚠ ${p.risk_score}` : `${Math.round(p.adherence_rate * 100)}%`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Appointment queue now has its own page (sidebar → Appointment Queue). */}
      </div>

      {/* RIGHT: detail pane — selected patient, or population view */}
      <div className="clinical-detail">
        <AnimatePresence mode="wait">
          {!selectedPatient ? (
            <motion.div key="welcome" className="grid" style={{ gap: 20 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="page-head" style={{ marginBottom: 0 }}>
                <h1>👨‍⚕️ Clinical Workspace</h1>
                <p>Select a patient on the left for their AI summary, trends, labs, body map and notes. The appointment queue, urgent reviews and population analytics now live in the sidebar.</p>
              </div>
              <div className="card center" style={{ padding: 40 }}>
                <div style={{ fontSize: "2.4rem" }}>🩺</div>
                <p className="muted" style={{ marginTop: 8 }}>No patient selected yet — pick one from the roster to begin.</p>
              </div>
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
                <button className={"tab" + (detailTab === "trends" ? " active" : "")} onClick={() => setDetailTab("trends")}>📈 Trends</button>
                <button className={"tab" + (detailTab === "insights" ? " active" : "")} onClick={() => setDetailTab("insights")}>🔍 Case Insights</button>
                <button className={"tab" + (detailTab === "labs" ? " active" : "")} onClick={() => setDetailTab("labs")}>🧪 Labs</button>
                <button className={"tab" + (detailTab === "body" ? " active" : "")} onClick={() => setDetailTab("body")}>🧍 Body Map</button>
                <button className={"tab" + (detailTab === "notes" ? " active" : "")} onClick={() => setDetailTab("notes")}>📝 Clinical Notes</button>
                <button className={"tab" + (detailTab === "schedule" ? " active" : "")} onClick={() => setDetailTab("schedule")}>📅 Schedule</button>
                <button className={"tab" + (detailTab === "market" ? " active" : "")} onClick={() => setDetailTab("market")}>🏠 Home Care</button>
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

              {detailTab === "trends" && (
                <div className="grid" style={{ gap: 20 }}>
                  <div className="card">
                    <h3 className="card-title">Pain trajectory</h3>
                    <p className="card-sub">Reported pain levels over recent check-ins</p>
                    {!analytics?.pain_series?.length ? (
                      <EmptyState icon="📈" title="No pain data recorded yet" />
                    ) : (
                      <ResponsiveContainer
                        width="100%"
                        height={220}
                        role="img"
                        aria-label={`Pain trend chart: from ${analytics.pain_series[0].pain}/10 on ${analytics.pain_series[0].date} to ${analytics.pain_series[analytics.pain_series.length - 1].pain}/10 on ${analytics.pain_series[analytics.pain_series.length - 1].date}`}
                      >
                        <LineChart data={analytics.pain_series} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke={gridColor} />
                          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke={gridColor} />
                          <Tooltip formatter={(v) => [`${v}/10`, "Pain"]} contentStyle={{ borderRadius: 12, border: "none" }} />
                          <Line type="monotone" dataKey="pain" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="card">
                    <h3 className="card-title">Medication doses — last 14 days</h3>
                    <p className="card-sub">Taken vs missed, per day</p>
                    {!analytics?.dose_series?.length ? (
                      <EmptyState icon="💊" title="No dose logs yet" />
                    ) : (
                      <ResponsiveContainer
                        width="100%"
                        height={220}
                        role="img"
                        aria-label={`Medication adherence chart over ${analytics.dose_series.length} days, overall adherence ${Math.round((analytics.adherence_rate ?? 0) * 100)} percent`}
                      >
                        <BarChart data={analytics.dose_series} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={gridColor} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={gridColor} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: "none" }} />
                          <Legend />
                          <Bar dataKey="taken" stackId="d" fill="#22c55e" name="Taken" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="missed" stackId="d" fill="#ef4444" name="Missed" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="card">
                    <h3 className="card-title">Overall adherence</h3>
                    <p className="card-sub">Share of doses taken as prescribed</p>
                    <div style={{ position: "relative", width: "100%", maxWidth: 260, margin: "0 auto" }}>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: "Adherence", value: Math.round((analytics?.adherence_rate ?? 0) * 100) }]} startAngle={90} endAngle={-270}>
                          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                          <RadialBar dataKey="value" cornerRadius={12} background fill={(analytics?.adherence_rate ?? 0) >= 0.85 ? "#22c55e" : (analytics?.adherence_rate ?? 0) >= 0.7 ? "#f59e0b" : "#ef4444"} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                        <div style={{ fontSize: "2rem", fontWeight: 800 }}>{Math.round((analytics?.adherence_rate ?? 0) * 100)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "insights" && (
                <div className="card">
                  <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <h3 className="card-title">🔍 Learning from past cases</h3>
                      <p className="card-sub">
                        AI compares this patient with anonymized outcomes from your panel — what worked, what failed, and how to avoid repeating it
                      </p>
                    </div>
                    {insights && <span className="badge">{insights.cases_analyzed} cases analyzed</span>}
                  </div>
                  {insightsLoading ? (
                    <div className="pulse muted" style={{ padding: "16px 0" }}>🔍 Comparing outcomes across the panel…</div>
                  ) : insights ? (
                    <div style={{ lineHeight: 1.65 }}><Markdown text={insights.insights} /></div>
                  ) : (
                    <button className="btn" onClick={loadInsights} style={{ marginTop: 8 }}>
                      🔍 Analyze similar cases
                    </button>
                  )}
                </div>
              )}

              {detailTab === "labs" && (
                <div className="grid" style={{ gap: 20 }}>
                  <div className="card">
                    <h3 className="card-title">🧪 Lab results</h3>
                    <p className="card-sub">Visible to {selectedPatient.name} in their Lab Results page</p>
                    {labs.length === 0 ? (
                      <EmptyState icon="🧪" title="No results on file" />
                    ) : labs.map((l) => (
                      <div className="lab-row" key={l.id}>
                        <div>
                          <div className="test">{l.test_name}</div>
                          {l.notes && <div className="muted" style={{ fontSize: ".76rem" }}>{l.notes}</div>}
                        </div>
                        <div style={{ fontWeight: 700 }}>{l.value} <span className="muted" style={{ fontWeight: 400, fontSize: ".8rem" }}>{l.unit}</span></div>
                        <div className="range">ref {l.reference_range || "—"}</div>
                        <span className={"badge " + (l.status === "high" ? "red" : l.status === "low" ? "amber" : "green")}>{l.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <h3 className="card-title">Add a result</h3>
                    <form onSubmit={saveLab} className="row wrap" style={{ gap: 10, alignItems: "flex-end" }}>
                      <label className="field" style={{ flex: "1 1 160px", marginBottom: 0 }}>
                        <span>Test</span>
                        <input value={labForm.test_name} onChange={(e) => setLabForm({ ...labForm, test_name: e.target.value })} placeholder="e.g. HbA1c" required />
                      </label>
                      <label className="field" style={{ flex: "0 1 110px", marginBottom: 0 }}>
                        <span>Value</span>
                        <input value={labForm.value} onChange={(e) => setLabForm({ ...labForm, value: e.target.value })} placeholder="7.2" required />
                      </label>
                      <label className="field" style={{ flex: "0 1 100px", marginBottom: 0 }}>
                        <span>Unit</span>
                        <input value={labForm.unit} onChange={(e) => setLabForm({ ...labForm, unit: e.target.value })} placeholder="%" />
                      </label>
                      <label className="field" style={{ flex: "0 1 130px", marginBottom: 0 }}>
                        <span>Reference</span>
                        <input value={labForm.reference_range} onChange={(e) => setLabForm({ ...labForm, reference_range: e.target.value })} placeholder="< 7.0" />
                      </label>
                      <label className="field" style={{ flex: "0 1 110px", marginBottom: 0 }}>
                        <span>Flag</span>
                        <select value={labForm.status} onChange={(e) => setLabForm({ ...labForm, status: e.target.value })}>
                          <option value="normal">normal</option>
                          <option value="high">high</option>
                          <option value="low">low</option>
                        </select>
                      </label>
                      <button className="btn" disabled={labSaving}>{labSaving ? "Saving…" : "Add"}</button>
                    </form>
                  </div>
                </div>
              )}

              {detailTab === "body" && (
                <div className="grid cols-2" style={{ alignItems: "start" }}>
                  <div className="card center" style={{ padding: 16 }}>
                    <div className="row" style={{ justifyContent: "center", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
                        <button className={"tab" + (bodySide === "front" ? " active" : "")} onClick={() => setBodySide("front")}>Front</button>
                        <button className={"tab" + (bodySide === "back" ? " active" : "")} onClick={() => setBodySide("back")}>Back</button>
                      </div>
                      <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
                        <button className={"tab" + (bodySex === "female" ? " active" : "")} onClick={() => setBodySex("female")}>♀</button>
                        <button className={"tab" + (bodySex === "male" ? " active" : "")} onClick={() => setBodySex("male")}>♂</button>
                      </div>
                    </div>
                    <BodyFigure
                      side={bodySide}
                      sex={bodySex}
                      latest={bodyMap.latest}
                      selected={bodyRegion}
                      onSelect={setBodyRegion}
                    />
                    <p className="muted" style={{ fontSize: ".76rem", marginTop: 6 }}>
                      Patient-reported pain map · tap a dot for its history
                    </p>
                  </div>
                  <div className="card">
                    <h3 className="card-title">
                      {bodyRegion ? `${bodyRegion} — history` : "Reported assessments"}
                    </h3>
                    <p className="card-sub">Logged by {selectedPatient.name} on their Body Map</p>
                    {(bodyRegion
                      ? bodyMap.history.filter((h) => h.region === bodyRegion)
                      : bodyMap.history
                    ).slice(0, 8).map((h) => (
                      <div className="list-row" key={h.id}>
                        <div className="lead">
                          <span style={{ width: 11, height: 11, borderRadius: 99, background: intensityColor(h.intensity), flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: ".88rem" }}>
                              {h.region} · {h.intensity}/10 {h.pain_type && `· ${h.pain_type}`}
                            </div>
                            <div className="muted" style={{ fontSize: ".76rem" }}>
                              {[h.worse_with && `worse: ${h.worse_with}`, h.swelling && "swelling", h.redness && "redness", h.injury && "recent injury", h.notes]
                                .filter(Boolean).join(" · ") || "no extra details"}
                            </div>
                          </div>
                        </div>
                        <span className="badge gray">
                          {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    ))}
                    {bodyMap.history.length === 0 && (
                      <EmptyState icon="🧍" title="No body-map reports yet" />
                    )}
                  </div>
                </div>
              )}

              {detailTab === "notes" && (
                <div className="card">
                  <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
                    <p className="card-sub" style={{ marginTop: 0 }}>Private notes — saved on this device</p>
                    {voice.supported && (
                      <button
                        className={"btn sm " + (voice.listening ? "danger" : "ghost")}
                        onClick={() => (voice.listening ? voice.stop() : voice.start())}
                        title="Dictate notes hands-free"
                      >
                        {voice.listening ? "⏹ Stop dictation" : "🎙️ Dictate"}
                      </button>
                    )}
                  </div>
                  {voice.listening && voice.transcript && (
                    <div className="muted pulse" style={{ fontSize: ".85rem", marginBottom: 8 }}>
                      “{voice.transcript}…”
                    </div>
                  )}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Type clinical notes here, or tap 🎙️ Dictate…"
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
                        <div className="lead"><div className="dot">{a.is_video ? "📹" : "🏥"}</div><div>{a.department} {a.reason ? `— ${a.reason}` : ""}</div></div>
                        <div className="row">
                          <span className="badge">{new Date(a.scheduled_for).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                          {a.is_video && (
                            <button className="btn sm" onClick={() => setActiveVisit(a)}>📹 Join</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailTab === "market" && (
                <div className="grid" style={{ gap: 20 }}>
                  <div className="card">
                    <h3 className="card-title">🏠 External treatments</h3>
                    <p className="card-sub">Out-of-hospital care booked for {selectedPatient.name}</p>
                    {market.bookings.length === 0 ? (
                      <EmptyState icon="🗓️" title="No external bookings" />
                    ) : market.bookings.map((b) => (
                      <div className="list-row" key={b.id}>
                        <div className="lead">
                          <div className="dot">🏠</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{b.service_type} · {b.provider}</div>
                            <div className="muted" style={{ fontSize: ".78rem" }}>
                              {new Date(b.scheduled_for).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {b.location}
                            </div>
                          </div>
                        </div>
                        <span className={"badge " + (b.status === "confirmed" ? "green" : b.status === "cancelled" ? "red" : "gray")}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <h3 className="card-title">🚚 Medication deliveries</h3>
                    <p className="card-sub">Home-delivery status for prescribed medications</p>
                    {market.deliveries.length === 0 ? (
                      <EmptyState icon="📦" title="No deliveries" />
                    ) : market.deliveries.map((d) => (
                      <div className="list-row" key={d.id}>
                        <div className="lead">
                          <div className="dot">💊</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{d.medication_name}</div>
                            <div className="muted" style={{ fontSize: ".78rem" }}>{d.pharmacy} · {d.tracking_code}</div>
                          </div>
                        </div>
                        <span className={"badge " + (d.status === "delivered" ? "green" : d.status === "cancelled" ? "red" : "amber")}>{d.status_label || d.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activeVisit && <VideoVisit appointment={activeVisit} onClose={() => setActiveVisit(null)} />}
    </div>
  );
}
