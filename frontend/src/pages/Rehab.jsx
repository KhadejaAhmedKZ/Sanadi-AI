import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { StatCard, Loader, ErrorNote } from "../components/ui.jsx";
import RehabSkeleton from "../components/RehabSkeleton.jsx";
import MotionCoach from "../components/MotionCoach.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import { useToast } from "../context/ToastContext.jsx";

const SCENE_BG = {
  garden: "linear-gradient(160deg,#134e2b,#166534)",
  beach: "linear-gradient(160deg,#0369a1,#0ea5e9)",
  forest: "linear-gradient(160deg,#14532d,#15803d)",
  space: "linear-gradient(160deg,#0f172a,#3730a3)",
  mountain: "linear-gradient(160deg,#1e293b,#475569)",
};

const ACHIEVEMENTS = [
  { id: "first", icon: "🥇", label: "First Session", test: (p) => p.total_sessions >= 1 },
  { id: "streak5", icon: "🔥", label: "5 Sessions", test: (p) => p.total_sessions >= 5 },
  { id: "streak10", icon: "🏅", label: "10 Sessions", test: (p) => p.total_sessions >= 10 },
  { id: "level3", icon: "⭐", label: "Level 3", test: (p) => p.level >= 3 },
  { id: "level5", icon: "🌟", label: "Level 5", test: (p) => p.level >= 5 },
  { id: "points100", icon: "💯", label: "100 Points", test: (p) => p.total_points >= 100 },
];

const CONFETTI = ["🎉", "✨", "⭐", "🎊", "💫"];

function ConfettiBurst({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="confetti-field">
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.span
              key={i}
              className="confetti-piece"
              initial={{ x: "50%", y: "60%", opacity: 1, scale: 0.6 }}
              animate={{
                x: `${50 + (Math.random() * 90 - 45)}%`,
                y: `${20 + Math.random() * 30}%`,
                opacity: 0,
                scale: 1.1,
                rotate: Math.random() * 200 - 100,
              }}
              transition={{ duration: 1.1 + Math.random() * 0.6, ease: "easeOut" }}
            >
              {CONFETTI[i % CONFETTI.length]}
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Rehab() {
  const { user } = useAuth();
  const toast = useToast();
  const patientId = user.id;
  const [exercises, setExercises] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [reps, setReps] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [coachMode, setCoachMode] = useState(false); // camera rep-counting
  const timerRef = useRef(null);
  const rafRef = useRef(0);
  const clockRef = useRef(null);

  async function loadProgress() {
    try { setProgress(await api.rehabProgress(patientId)); } catch { /* ignore */ }
  }

  useEffect(() => {
    Promise.all([api.exercises(), api.rehabProgress(patientId)])
      .then(([ex, pr]) => { setExercises(ex); setProgress(pr); setSelected(ex[0]); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  // Auto-counter (guided mode). In Motion Coach mode reps come from the camera.
  useEffect(() => {
    if (!running || !selected || coachMode) return;
    const speed = difficulty === "hard" ? 1600 : difficulty === "medium" ? 1200 : 900;
    timerRef.current = setInterval(() => {
      setReps((r) => {
        if (r + 1 >= selected.target_reps) {
          clearInterval(timerRef.current);
          setRunning(false);
          setDone(true);
          return selected.target_reps;
        }
        return r + 1;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [running, selected, difficulty, coachMode]);

  // A real rep detected by the camera (Motion Coach mode).
  function addRealRep() {
    setReps((r) => {
      if (!selected || r >= selected.target_reps) return r;
      if (r + 1 >= selected.target_reps) { setRunning(false); setDone(true); return selected.target_reps; }
      return r + 1;
    });
  }

  useEffect(() => {
    if (!running || !selected) { setPhase(0); return; }
    const speed = difficulty === "hard" ? 1600 : difficulty === "medium" ? 1200 : 900;
    const startTime = performance.now();
    let lastUpdate = 0;
    function loop(now) {
      if (now - lastUpdate > 33) {
        setPhase(((now - startTime) % speed) / speed);
        lastUpdate = now;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, selected, difficulty]);

  useEffect(() => {
    if (!running) { clearInterval(clockRef.current); return; }
    clockRef.current = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(clockRef.current);
  }, [running]);

  function start() { setReps(0); setDone(false); setSessionSeconds(0); setRunning(true); }
  function stop() { clearInterval(timerRef.current); setRunning(false); }

  async function saveSession(painLevel) {
    if (!selected) return;
    try {
      const res = await api.logRehabSession({
        patient_id: patientId,
        exercise: selected.name,
        reps_completed: reps,
        reps_target: selected.target_reps,
        difficulty,
        pain_level: painLevel,
      });
      setDone(false);
      setReps(0);
      await loadProgress();
      setError("");
      toast.success(`Session saved — you earned ${res.points} points! 🎉`);
    } catch (e) { setError(e.message); }
  }

  if (loading) return <Loader label="Loading VR rehabilitation…" />;

  const pct = selected ? Math.round((reps / selected.target_reps) * 100) : 0;
  const levelPct = progress ? (progress.total_points % 100) : 0;
  const calorieFactor = difficulty === "hard" ? 0.9 : difficulty === "medium" ? 0.6 : 0.4;
  const calories = Math.round(reps * calorieFactor * 10);
  const unlocked = progress ? ACHIEVEMENTS.filter((a) => a.test(progress)) : [];

  return (
    <div className="grid" style={{ gap: 22 }}>
      <motion.div
        className="vr-hero"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="blob-field">
          <div className="blob" style={{ width: 260, height: 260, background: "#06b6d4", top: -70, left: -40 }} />
          <div className="blob" style={{ width: 220, height: 220, background: "#8b5cf6", bottom: -60, right: 0, animationDelay: "3s" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <span className="badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff" }}>🥽 VR Control Center</span>
          <h1 style={{ margin: "10px 0 6px", fontSize: "2rem" }}>Rehabilitation Session</h1>
          <p style={{ margin: 0, opacity: .9, maxWidth: 480 }}>
            Guided physiotherapy with real-time AI rep tracking and a holographic motion coach.
          </p>
          {!running && !done && (
            <motion.button
              className="btn lg gradient mt"
              onClick={start}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ background: "#fff", color: "var(--primary-600)" }}
            >
              ▶ Start VR Session
            </motion.button>
          )}
        </div>
        {progress && (
          <div className="vr-hero-ring">
            <ProgressRing value={levelPct} size={100} color="#fff" label={`Lv ${progress.level}`} sublabel={`${levelPct}/100 pts`} />
          </div>
        )}
      </motion.div>

      <ErrorNote message={error} />

      {progress && (
        <div className="grid cols-4">
          <StatCard icon="⏱️" value={formatDuration(sessionSeconds)} label="Session duration" accent="#0ea5e9" />
          <StatCard icon="🔥" value={calories} label="Est. calories" accent="#f97316" />
          <StatCard icon="🦿" value={`${pct}%`} label="Mobility this rep" accent="#22c55e" />
          <StatCard icon="🩹" value={progress.avg_pain ?? "—"} label="Avg pain" accent="#ef4444" />
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div>
          <div
            className={"vr-stage" + (running ? " active" : "")}
            style={{ background: selected ? SCENE_BG[selected.vr_scene] : undefined, position: "relative" }}
          >
            <ConfettiBurst show={done} />
            <div className="vr-hud">
              <span>🎯 {selected?.name}</span>
              <span>{coachMode ? "🎥 Motion Coach" : "🎞️ Guided"} · ⚙️ {difficulty}</span>
            </div>
            <div className="rehab-skeleton-wrap">
              {coachMode && selected ? (
                <MotionCoach exerciseId={selected.id} running={running} onRep={addRealRep} />
              ) : (
                <RehabSkeleton exerciseId={selected?.id} bendFactor={phase} running={running} />
              )}
              {done && (
                <motion.div
                  className="rehab-done-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  ✓ Session complete
                </motion.div>
              )}
            </div>
            <div className="rep-counter">{reps}<span style={{ fontSize: "1.2rem" }}>/{selected?.target_reps}</span></div>
            <div style={{ width: "70%" }}>
              <div className="progress-track" style={{ background: "rgba(255,255,255,.25)" }}>
                <motion.div className="progress-fill" animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
              </div>
            </div>
            <div style={{ marginTop: 12, opacity: .9 }}>
              {done ? "Great job — session complete!" : running ? "Follow the on-screen movement…" : "Press Start when you're ready"}
            </div>
          </div>

          <div className="row wrap mt" style={{ gap: 10 }}>
            <button
              className={"btn sm " + (coachMode ? "" : "secondary")}
              onClick={() => setCoachMode((m) => !m)}
              disabled={running}
              title="Use your camera to count real reps by tracking your body"
            >
              {coachMode ? "🎥 Motion Coach: ON" : "🎥 Motion Coach: OFF"}
            </button>
            {!running && !done && <button className="btn lg" onClick={start}>▶ Start session</button>}
            {running && <button className="btn danger lg" onClick={stop}>⏸ Pause</button>}
            {done && (
              <>
                <span className="muted" style={{ alignSelf: "center" }}>How much pain? </span>
                {[0, 3, 6, 9].map((p) => (
                  <button key={p} className="btn secondary" onClick={() => saveSession(p)}>
                    {p === 0 ? "None" : p <= 3 ? "Mild" : p <= 6 ? "Moderate" : "High"}
                  </button>
                ))}
              </>
            )}
            <div className="row" style={{ marginLeft: "auto" }}>
              {selected?.levels.map((lv) => (
                <button
                  key={lv}
                  className={"btn sm " + (difficulty === lv ? "" : "secondary")}
                  onClick={() => setDifficulty(lv)}
                  disabled={running}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid" style={{ gap: 18 }}>
          <div className="card">
            <h3 className="card-title">Exercises</h3>
            <p className="card-sub">Choose your prescribed routine</p>
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="list-row"
                style={{ cursor: "pointer", opacity: running ? .5 : 1 }}
                onClick={() => { if (!running) { setSelected(ex); setReps(0); setDone(false); } }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !running) {
                    e.preventDefault();
                    setSelected(ex); setReps(0); setDone(false);
                  }
                }}
                role="button"
                tabIndex={running ? -1 : 0}
                aria-pressed={selected?.id === ex.id}
                aria-label={`Select exercise: ${ex.name}`}
              >
                <div className="lead">
                  <div className="dot">{selected?.id === ex.id ? "✅" : "🏋️"}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{ex.name}</div>
                    <div className="muted" style={{ fontSize: ".8rem" }}>{ex.area} · {ex.target_reps} reps</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="card-title">🏆 Achievements</h3>
            <p className="card-sub">{unlocked.length}/{ACHIEVEMENTS.length} unlocked</p>
            <div className="achievement-grid">
              {ACHIEVEMENTS.map((a) => {
                const isUnlocked = unlocked.some((u) => u.id === a.id);
                return (
                  <div key={a.id} className={"achievement-badge" + (isUnlocked ? " unlocked" : "")} title={a.label}>
                    <span>{a.icon}</span>
                    <div className="muted" style={{ fontSize: ".68rem", marginTop: 4 }}>{a.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {progress?.recent?.length > 0 && (
        <div className="card">
          <h3 className="card-title">Recent sessions</h3>
          {progress.recent.map((s, i) => (
            <div className="list-row" key={i}>
              <div className="lead">
                <div className="dot">🥽</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{s.exercise}</div>
                  <div className="muted" style={{ fontSize: ".8rem" }}>{s.reps} reps · {s.difficulty}</div>
                </div>
              </div>
              <span className="badge green">+{s.points} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
