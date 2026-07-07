import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import { ErrorNote } from "../components/ui.jsx";

// One sentence in → a whole plan out. These seed the demo.
const EXAMPLES = [
  "I've been feeling dizzy for two days.",
  "My knee pain is getting worse after physio.",
  "I keep forgetting my evening medication.",
];

// Category → accent, matching the deck / brand palette.
const CAT = {
  review: { color: "#2563EB", bg: "#EAF1FF" },
  insight: { color: "#7C3AED", bg: "#F1EBFD" },
  action: { color: "#0E9AA0", bg: "#E2F5F4" },
  notify: { color: "#E08A00", bg: "#FBEFDA" },
  brief: { color: "#0891B2", bg: "#E1F4F9" },
};

function StatusChip({ status }) {
  if (status === "proposed")
    return <span className="badge" style={{ background: "#FBEFDA", color: "#E08A00" }}>Needs your OK</span>;
  if (status === "skipped")
    return <span className="badge" style={{ background: "#EEF2F7", color: "#5B7085" }}>Skipped</span>;
  return <span className="badge" style={{ background: "#E7F7EE", color: "#16A34A" }}>Done ✓</span>;
}

export default function CareCoordinator() {
  const { user } = useAuth();
  const toast = useToast();
  const [message, setMessage] = useState(EXAMPLES[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function run(e) {
    e?.preventDefault();
    if (!message.trim() || running) return;
    setRunning(true);
    setError("");
    setResult(null);
    setSteps([]);
    try {
      const res = await api.coordinatorRun(user.id, message.trim());
      setResult(res);
      setSteps(res.steps || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  async function confirmBooking(stepKey) {
    if (confirming) return;
    setConfirming(true);
    try {
      const res = await api.coordinatorConfirm(
        user.id,
        "book_appointment",
        result.department,
        `AI Care Coordinator follow-up: ${result.message}`
      );
      const when = new Date(res.appointment.scheduled_for);
      const stamp =
        when.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
        " at " +
        when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setSteps((prev) =>
        prev.map((s) =>
          s.key === stepKey
            ? {
                ...s,
                status: "done",
                title: `Booked a ${res.appointment.department} follow-up`,
                detail: `Video visit scheduled for ${stamp}.`,
              }
            : s
        )
      );
      toast.success("Follow-up booked");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1 className="card-title" style={{ fontSize: 26 }}>🧭 AI Care Coordinator</h1>
        <p className="muted">
          Tell it what's going on in one sentence. It reviews your record, decides what needs to
          happen, and does the safe steps for you — asking first before anything that can't be undone.
        </p>
      </div>

      <form className="card" onSubmit={run}>
        <label className="card-sub" style={{ display: "block", marginBottom: 8 }}>
          What's going on today?
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="e.g. I've been feeling dizzy for two days."
          style={{
            width: "100%",
            resize: "vertical",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #E4EAF3",
            fontFamily: "inherit",
            fontSize: 15,
            color: "#0F2540",
            outline: "none",
          }}
        />
        <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} className="btn ghost sm" onClick={() => setMessage(ex)}>
              {ex}
            </button>
          ))}
        </div>
        <div className="row between" style={{ marginTop: 14, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Prototype · synthetic data · decision-support only
          </span>
          <button className="btn" disabled={running}>
            {running ? "Coordinating…" : "▸ Run Coordinator"}
          </button>
        </div>
      </form>

      {error && <ErrorNote message={error} />}

      {running && (
        <div className="card">
          <p className="muted">🧠 Planning across your medications, trends, carer and doctor…</p>
        </div>
      )}

      {result && (
        <>
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ borderLeft: "4px solid #2563EB" }}
          >
            <div className="card-sub" style={{ color: "#2563EB", fontWeight: 700 }}>
              AI Care Coordinator {result.ai_online ? "" : "· offline mode"}
            </div>
            <p className="lead" style={{ marginTop: 6 }}>{result.summary}</p>
          </motion.div>

          <div className="card">
            <div className="row between" style={{ marginBottom: 10, alignItems: "center" }}>
              <h2 className="card-title">The plan it ran</h2>
              <span
                className="badge"
                style={{
                  background: result.risk.level === "high" ? "#FCE9E9" : "#EEF2F7",
                  color: result.risk.level === "high" ? "#E23B3B" : "#5B7085",
                }}
              >
                risk {result.risk.score}/100 · {result.risk.level}
              </span>
            </div>

            <div style={{ display: "grid" }}>
              {steps.map((s, i) => {
                const c = CAT[s.category] || CAT.review;
                return (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.18, duration: 0.3 }}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 14,
                      alignItems: "start",
                      padding: "12px 0",
                      borderTop: i ? "1px solid #EEF2F7" : "none",
                      opacity: s.status === "skipped" ? 0.6 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: c.bg,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 18,
                      }}
                    >
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0F2540" }}>{s.title}</div>
                      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{s.detail}</div>
                      {s.status === "proposed" && s.action === "book_appointment" && (
                        <button
                          className="btn secondary"
                          style={{ marginTop: 10 }}
                          disabled={confirming}
                          onClick={() => confirmBooking(s.key)}
                        >
                          {confirming ? "Booking…" : "Confirm & book"}
                        </button>
                      )}
                    </div>
                    <StatusChip status={s.status} />
                  </motion.div>
                );
              })}
            </div>

            <p className="muted" style={{ fontSize: 11.5, marginTop: 14, fontStyle: "italic" }}>
              The Coordinator performs safe, reversible steps automatically and asks for your approval
              before anything irreversible. Decision-support only — it never replaces your doctor.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
