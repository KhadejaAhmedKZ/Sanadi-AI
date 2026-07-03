import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { COURSES, AUDIENCE_LABEL } from "../data/courses.js";

function Certificate({ course, userName, onClose }) {
  const date = new Date().toLocaleDateString(undefined, { dateStyle: "long" });

  function print() {
    const w = window.open("", "_blank", "width=900,height=650");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Certificate</title><style>
      body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:96vh;background:#f6f4ee;margin:0}
      .cert{background:#fff;border:3px double #b08d2f;border-radius:14px;padding:56px 72px;text-align:center;max-width:640px}
      .brand{color:#0e7490;font-weight:bold;letter-spacing:.14em;font-size:.8rem;text-transform:uppercase}
      h1{margin:14px 0 4px;font-size:2rem;color:#1e293b}
      .name{font-size:1.6rem;color:#0e7490;margin:18px 0 4px;font-style:italic}
      .course{font-size:1.15rem;font-weight:bold;margin:10px 0}
      .foot{margin-top:26px;color:#64748b;font-size:.85rem}
      .demo{margin-top:14px;color:#94a3b8;font-size:.72rem}
    </style></head><body><div class="cert">
      <div class="brand">Sanadi AI · Learning Hub</div>
      <h1>Certificate of Completion</h1>
      <div>this certifies that</div>
      <div class="name">${userName}</div>
      <div>has successfully completed</div>
      <div class="course">${course.icon} ${course.title}</div>
      <div class="foot">${date} · ${course.lessons.length} lessons · ${course.duration}</div>
      <div class="demo">Demo certificate — not an accredited credential</div>
    </div><script>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="video-overlay" role="dialog" aria-modal="true" aria-label="Certificate">
      <motion.div
        className="card cert-card"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="cert-inner">
          <div className="cert-brand">SANADI AI · LEARNING HUB</div>
          <h2 style={{ margin: "10px 0 2px" }}>Certificate of Completion</h2>
          <p className="muted" style={{ margin: 0 }}>this certifies that</p>
          <div className="cert-name">{userName}</div>
          <p className="muted" style={{ margin: 0 }}>has successfully completed</p>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", margin: "8px 0" }}>
            {course.icon} {course.title}
          </div>
          <div className="muted" style={{ fontSize: ".82rem" }}>
            {new Date().toLocaleDateString(undefined, { dateStyle: "long" })} · {course.lessons.length} lessons
          </div>
          <div className="muted" style={{ fontSize: ".7rem", marginTop: 10 }}>
            Demo certificate — not an accredited credential
          </div>
        </div>
        <div className="row" style={{ gap: 10, justifyContent: "center", marginTop: 16 }}>
          <button className="btn" onClick={print}>🖨 Print / save PDF</button>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Learning() {
  const { user } = useAuth();
  const role = user?.role || "patient";
  const [progress, setProgress] = useLocalStorage(`sanadi_learn_${user?.id ?? "anon"}`, {});
  const [openCourse, setOpenCourse] = useState(null);
  const [certFor, setCertFor] = useState(null);

  const { mine, others } = useMemo(() => {
    const mine = COURSES.filter((c) => c.audience === role);
    const others = COURSES.filter((c) => c.audience !== role);
    return { mine, others };
  }, [role]);

  const doneCount = (c) => (progress[c.id] || []).length;
  const pct = (c) => Math.round((doneCount(c) / c.lessons.length) * 100);
  const isComplete = (c) => doneCount(c) === c.lessons.length;

  function toggleLesson(course, idx) {
    const done = new Set(progress[course.id] || []);
    if (done.has(idx)) done.delete(idx);
    else done.add(idx);
    const next = { ...progress, [course.id]: [...done] };
    setProgress(next);
    if ([...done].length === course.lessons.length) setCertFor(course);
  }

  const completedTotal = COURSES.filter(isComplete).length;

  function CourseCard({ c, i }) {
    const open = openCourse === c.id;
    const done = new Set(progress[c.id] || []);
    return (
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04 }}
      >
        <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
          <div className="row" style={{ gap: 12 }}>
            <div className="stat-icon" style={{ fontSize: "1.3rem" }}>{c.icon}</div>
            <div>
              <h3 className="card-title" style={{ marginBottom: 2 }}>{c.title}</h3>
              <div className="muted" style={{ fontSize: ".82rem" }}>{c.blurb}</div>
            </div>
          </div>
          <span
            className="badge"
            style={{ background: AUDIENCE_LABEL[c.audience].color, color: "#fff", whiteSpace: "nowrap" }}
          >
            {AUDIENCE_LABEL[c.audience].label}
          </span>
        </div>

        <div className="row between" style={{ margin: "12px 0 8px", flexWrap: "wrap", gap: 8 }}>
          <div className="muted" style={{ fontSize: ".8rem" }}>
            ⏱ {c.duration} · {c.lessons.length} lessons
            {isComplete(c) && <span className="badge green" style={{ marginLeft: 8 }}>✓ completed</span>}
          </div>
          <button className="btn ghost sm" onClick={() => setOpenCourse(open ? null : c.id)}>
            {open ? "Hide lessons" : doneCount(c) > 0 ? "Continue →" : "Start course →"}
          </button>
        </div>

        <div className="learn-progress" role="progressbar" aria-valuenow={pct(c)} aria-valuemin={0} aria-valuemax={100}>
          <div className="learn-progress-fill" style={{ width: `${pct(c)}%` }} />
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              {c.lessons.map((l, idx) => (
                <div key={idx} className="lesson-row">
                  <label className="row" style={{ gap: 10, cursor: "pointer", alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={done.has(idx)}
                      onChange={() => toggleLesson(c, idx)}
                      style={{ width: "auto", marginTop: 4 }}
                    />
                    <span>
                      <span style={{ fontWeight: 700, fontSize: ".92rem" }}>{idx + 1}. {l.title}</span>
                      <span className="muted" style={{ display: "block", fontSize: ".84rem", lineHeight: 1.55, marginTop: 2 }}>
                        {l.body}
                      </span>
                    </span>
                  </label>
                </div>
              ))}
              {isComplete(c) && (
                <button className="btn mt" onClick={() => setCertFor(c)}>🎓 View certificate</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🎓 Learning Hub</h1>
        <p>
          Short courses with certificates — training for clinicians and caregivers,
          plain-language health education for patients.{" "}
          <span className="badge gray">demo content — not accredited</span>
        </p>
      </div>

      {completedTotal > 0 && (
        <div className="card" style={{ padding: "12px 18px" }}>
          🏆 <strong>{completedTotal}</strong> course{completedTotal === 1 ? "" : "s"} completed —
          certificates available inside each completed course.
        </div>
      )}

      <div>
        <h2 style={{ marginBottom: 14 }}>Recommended for you</h2>
        <div className="grid cols-2">
          {mine.map((c, i) => <CourseCard key={c.id} c={c} i={i} />)}
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: 14 }}>Explore the full catalog</h2>
        <div className="grid cols-2">
          {others.map((c, i) => <CourseCard key={c.id} c={c} i={i} />)}
        </div>
      </div>

      {certFor && (
        <Certificate course={certFor} userName={user?.name || "Learner"} onClose={() => setCertFor(null)} />
      )}
    </div>
  );
}
