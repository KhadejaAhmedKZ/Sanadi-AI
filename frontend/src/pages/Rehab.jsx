import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { StatCard, Loader, ErrorNote } from "../components/ui.jsx";

const SCENE_BG = {
  garden: "linear-gradient(160deg,#134e2b,#166534)",
  beach: "linear-gradient(160deg,#0369a1,#0ea5e9)",
  forest: "linear-gradient(160deg,#14532d,#15803d)",
  space: "linear-gradient(160deg,#0f172a,#3730a3)",
  mountain: "linear-gradient(160deg,#1e293b,#475569)",
};

export default function Rehab() {
  const { user } = useAuth();
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
  const timerRef = useRef(null);

  async function loadProgress() {
    try { setProgress(await api.rehabProgress(patientId)); } catch { /* ignore */ }
  }

  useEffect(() => {
    Promise.all([api.exercises(), api.rehabProgress(patientId)])
      .then(([ex, pr]) => { setExercises(ex); setProgress(pr); setSelected(ex[0]); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  // Auto rep counter simulating AI movement tracking.
  useEffect(() => {
    if (!running || !selected) return;
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
  }, [running, selected, difficulty]);

  function start() { setReps(0); setDone(false); setRunning(true); }
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
      alert(`Session saved! You earned ${res.points} points 🎉`);
    } catch (e) { setError(e.message); }
  }

  if (loading) return <Loader label="Loading VR rehabilitation…" />;

  const pct = selected ? Math.round((reps / selected.target_reps) * 100) : 0;
  const levelPct = progress ? (progress.total_points % 100) : 0;

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🥽 VR Rehabilitation</h1>
        <p>Immersive physiotherapy guided by the Rehabilitation agent with AI rep tracking.</p>
      </div>

      <ErrorNote message={error} />

      {progress && (
        <div className="grid cols-4">
          <StatCard icon="🏆" value={progress.level} label="Rehab level" accent="#10b981" />
          <StatCard icon="⭐" value={progress.total_points} label="Total points" accent="#f59e0b" />
          <StatCard icon="🔁" value={progress.total_sessions} label="Sessions done" accent="#0ea5e9" />
          <StatCard icon="🩹" value={progress.avg_pain ?? "—"} label="Avg pain" accent="#ef4444" />
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        {/* VR stage */}
        <div>
          <div
            className={"vr-stage" + (running ? " active" : "")}
            style={{ background: selected ? SCENE_BG[selected.vr_scene] : undefined }}
          >
            <div className="vr-hud">
              <span>🎯 {selected?.name}</span>
              <span>⚙️ {difficulty}</span>
            </div>
            <div className="avatar-fig">{running ? "🏃" : done ? "🎉" : "🧍"}</div>
            <div className="rep-counter">{reps}<span style={{ fontSize: "1.2rem" }}>/{selected?.target_reps}</span></div>
            <div style={{ width: "70%" }}>
              <div className="progress-track" style={{ background: "rgba(255,255,255,.25)" }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div style={{ marginTop: 12, opacity: .9 }}>
              {done ? "Great job — session complete!" : running ? "Follow the on-screen movement…" : "Press Start when you're ready"}
            </div>
          </div>

          <div className="row wrap mt" style={{ gap: 10 }}>
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

        {/* Exercise list + level ring */}
        <div className="grid" style={{ gap: 18 }}>
          <div className="card center">
            <h3 className="card-title">Progress to next level</h3>
            <div className="level-ring" style={{ "--pct": `${levelPct}%`, margin: "12px auto" }}>
              <div className="inner">{progress?.level ?? 1}</div>
            </div>
            <div className="muted">{levelPct}/100 points</div>
          </div>

          <div className="card">
            <h3 className="card-title">Exercises</h3>
            <p className="card-sub">Choose your prescribed routine</p>
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="list-row"
                style={{ cursor: "pointer", opacity: running ? .5 : 1 }}
                onClick={() => { if (!running) { setSelected(ex); setReps(0); setDone(false); } }}
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
