import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import Markdown from "../components/Markdown.jsx";
import { EmptyState, ErrorNote } from "../components/ui.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";

const STATUS_BADGE = { normal: "green", high: "red", low: "amber" };

export default function Labs() {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    api.labs(user.id)
      .then(setLabs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  async function explain() {
    setExplaining(true);
    setError("");
    try {
      const res = await api.explainLabs(user.id);
      setExplanation(res.explanation);
    } catch (e) { setError(e.message); }
    finally { setExplaining(false); }
  }

  const flagged = labs.filter((l) => l.status !== "normal").length;

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🧪 Lab Results</h1>
        <p>Results added by your care team — with a plain-language AI explanation when you want one.</p>
      </div>

      <ErrorNote message={error} />

      {loading ? <SkeletonList /> : labs.length === 0 ? (
        <EmptyState icon="🧪" title="No lab results yet" hint="Your doctor adds results here after tests." />
      ) : (
        <>
          <div className="grid cols-2">
            <div className="card">
              <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 className="card-title">Latest results</h3>
                  <p className="card-sub">
                    {labs.length} result{labs.length === 1 ? "" : "s"} on file
                    {flagged > 0 ? ` · ${flagged} flagged` : " · all in range"}
                  </p>
                </div>
              </div>
              {labs.map((l) => (
                <div className="lab-row" key={l.id}>
                  <div>
                    <div className="test">{l.test_name}</div>
                    {l.notes && <div className="muted" style={{ fontSize: ".76rem" }}>{l.notes}</div>}
                  </div>
                  <div style={{ fontWeight: 700 }}>{l.value} <span className="muted" style={{ fontWeight: 400, fontSize: ".8rem" }}>{l.unit}</span></div>
                  <div className="range">ref {l.reference_range || "—"}<br /><span className="when">{new Date(l.taken_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
                  <span className={"badge " + (STATUS_BADGE[l.status] || "gray")}>{l.status}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="card-title">🧠 What do my results mean?</h3>
              <p className="card-sub">The AI explains your results in everyday language — it never diagnoses.</p>
              {explaining ? (
                <div className="pulse muted" style={{ padding: "14px 0" }}>🧠 Reading your results…</div>
              ) : explanation ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ lineHeight: 1.65 }}>
                  <Markdown text={explanation} />
                </motion.div>
              ) : (
                <button className="btn" onClick={explain}>🧠 Explain my results</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
