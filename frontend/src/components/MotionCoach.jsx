import { useEffect, useRef, useState } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const LINKS = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28], [0, 11], [0, 12],
];

// Left / right landmark index sets.
const SIDES = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};

function angle(a, b, c) {
  if (!a || !b || !c) return null;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1e-6;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}
const dist = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);

// Per-exercise: which joints to track, the signal to measure, thresholds
// (hysteresis) for a completed rep, and live form cues.
const COACH = {
  "knee-flexion": {
    label: "Bend and straighten your knee",
    needs: ["hip", "knee", "ankle"],
    type: "cycle",
    signal: (lm, s) => angle(lm[s.hip], lm[s.knee], lm[s.ankle]),
    active: (v) => v < 110, rest: (v) => v > 150,
    cue: (v, on) => (on ? "Good bend — now straighten 💪" : v > 150 ? "Bend your knee" : "Keep bending…"),
  },
  "shoulder-raise": {
    label: "Raise your arm to shoulder height, then lower",
    needs: ["hip", "shoulder", "elbow"],
    type: "cycle",
    signal: (lm, s) => angle(lm[s.hip], lm[s.shoulder], lm[s.elbow]),
    active: (v) => v > 70, rest: (v) => v < 40,
    cue: (v, on) => (on ? "Great — lower slowly 🎯" : "Raise your arm up"),
  },
  "balance-reach": {
    label: "Reach your arm out, then bring it back",
    needs: ["shoulder", "wrist"],
    type: "cycle",
    signal: (lm, s) => dist(lm[s.shoulder], lm[s.wrist]),
    active: (v) => v > 0.30, rest: (v) => v < 0.22,
    cue: (v, on) => (on ? "Nice reach — return 🎯" : "Reach out further"),
  },
  "ankle-circles": {
    label: "Lift and circle your ankle",
    needs: ["knee", "ankle"],
    type: "motion",
    signal: (lm, s) => (lm[s.ankle] && lm[s.knee] ? lm[s.knee].y - lm[s.ankle].y : null),
    cue: (_, on) => (on ? "Keep circling 🔄" : "Move your ankle"),
  },
  "grip-strength": {
    label: "Squeeze and release — move your hand rhythmically",
    needs: ["elbow", "wrist"],
    type: "motion",
    signal: (lm, s) => (lm[s.wrist] && lm[s.elbow] ? dist(lm[s.wrist], lm[s.elbow]) : null),
    cue: (_, on) => (on ? "Keep squeezing 🖐️" : "Squeeze your hand"),
  },
};

function bestSide(lm, needs) {
  const score = (side) => needs.reduce((a, k) => a + (lm[SIDES[side][k]]?.visibility ?? 0), 0);
  return score("left") >= score("right") ? SIDES.left : SIDES.right;
}

export default function MotionCoach({ exerciseId, onRep, running }) {
  const cfg = COACH[exerciseId] || COACH["knee-flexion"];
  const [state, setState] = useState("loading"); // loading | active | error | motion
  const [cue, setCue] = useState("Get into frame…");
  const [conf, setConf] = useState(0);

  const videoRef = useRef(null);
  const skelRef = useRef(null);
  const flashRef = useRef(0);
  const poseRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);
  const repStateRef = useRef({ armed: false, band: [], lastPeakDir: 0, lastRepAt: 0 });
  const onRepRef = useRef(onRep);
  onRepRef.current = onRep;

  useEffect(() => {
    let cancelled = false;
    repStateRef.current = { armed: false, band: [], lastPeakDir: 0, lastRepAt: 0 };
    async function boot() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        poseRef.current = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
          runningMode: "VIDEO", numPoses: 1,
        });
        if (cancelled) return;
        setState("active");
        rafRef.current = requestAnimationFrame(loop);
      } catch {
        setState("error");
      }
    }
    boot();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      try { poseRef.current?.close(); } catch { /* ignore */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  function loop(ts) {
    rafRef.current = requestAnimationFrame(loop);
    if (ts && lastTickRef.current && ts - lastTickRef.current < 60) return; // ~16 fps
    lastTickRef.current = ts || performance.now();
    try { analyze(ts); } catch { /* transient */ }
  }

  const W = 480, H = 360;
  const mx = (p) => (1 - p.x) * W; // mirror horizontally (selfie view)
  const my = (p) => p.y * H;

  function paintBg(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1220"); g.addColorStop(1, "#111a2e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H * 0.92); ctx.lineTo(W, H * 0.92); ctx.stroke();
  }

  function drawSkeleton(ctx, lm, side, activeHi) {
    // limbs
    ctx.lineCap = "round"; ctx.lineWidth = 7; ctx.strokeStyle = "#38bdf8";
    for (const [a, b] of LINKS) {
      const pa = lm[a], pb = lm[b];
      if ((pa?.visibility ?? 0) > 0.3 && (pb?.visibility ?? 0) > 0.3) {
        ctx.beginPath(); ctx.moveTo(mx(pa), my(pa)); ctx.lineTo(mx(pb), my(pb)); ctx.stroke();
      }
    }
    // generic joints
    ctx.fillStyle = "#e2e8f0";
    for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      const p = lm[i]; if ((p?.visibility ?? 0) > 0.3) { ctx.beginPath(); ctx.arc(mx(p), my(p), 5, 0, 7); ctx.fill(); }
    }
    // tracked joints — highlighted, green when in the active phase
    const col = activeHi ? "#4ade80" : "#fbbf24";
    for (const k of cfg.needs) {
      const p = lm[side[k]];
      if ((p?.visibility ?? 0) > 0.3) {
        ctx.shadowColor = col; ctx.shadowBlur = 14;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(mx(p), my(p), 9, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    // rep flash
    const since = performance.now() - flashRef.current;
    if (since < 350) {
      ctx.globalAlpha = 1 - since / 350;
      ctx.fillStyle = "#4ade80"; ctx.font = "bold 48px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("+1", W / 2, H / 2);
      ctx.globalAlpha = 1;
    }
  }

  function analyze(ts) {
    const video = videoRef.current, pose = poseRef.current;
    if (!video || !pose || video.readyState < 2) return;
    const res = pose.detectForVideo(video, ts || performance.now());

    const canvas = skelRef.current, ctx = canvas?.getContext("2d");
    if (ctx && canvas.width !== W) { canvas.width = W; canvas.height = H; }
    if (ctx) paintBg(ctx);

    const lm = res?.landmarks?.[0];
    if (!lm) { setConf(0); setCue("Step into view"); return; }

    const side = bestSide(lm, cfg.needs);
    const vis = cfg.needs.map((k) => lm[side[k]]?.visibility ?? 0);
    const c = Math.round((vis.reduce((a, b) => a + b, 0) / vis.length) * 100);
    setConf(c);

    const v = cfg.signal(lm, side);
    const rs = repStateRef.current;
    let activeHi = false;

    if (c < 30) {
      setCue("Move into full view");
    } else if (!running) {
      setCue("Press Start, then move");
    } else if (v != null && cfg.type === "cycle") {
      const on = cfg.active(v);
      if (on && !rs.armed) rs.armed = true;
      else if (rs.armed && cfg.rest(v)) { rs.armed = false; countRep(); }
      activeHi = on; setCue(cfg.cue(v, on));
    } else if (v != null) {
      rs.band.push(v); if (rs.band.length > 12) rs.band.shift();
      const lo = Math.min(...rs.band), hi = Math.max(...rs.band);
      const amp = hi - lo, mid = (hi + lo) / 2, dir = v > mid ? 1 : -1;
      if (amp > 0.06 && dir !== rs.lastPeakDir && rs.lastPeakDir !== 0 && dir === 1) countRep();
      rs.lastPeakDir = dir; activeHi = amp > 0.06; setCue(cfg.cue(v, activeHi));
    }

    if (ctx) drawSkeleton(ctx, lm, side, activeHi);
  }

  function countRep() {
    const rs = repStateRef.current;
    const now = performance.now();
    if (now - rs.lastRepAt < 500) return; // debounce
    rs.lastRepAt = now;
    flashRef.current = now;
    onRepRef.current?.();
  }

  return (
    <div className="coach">
      <div className="coach-stage">
        <canvas ref={skelRef} className="coach-skel" />
        {/* live camera shrunk into the corner so the skeleton stays clear */}
        <div className="coach-pip">
          <video ref={videoRef} muted playsInline />
          <span className="coach-pip-tag">you</span>
        </div>
        {state === "loading" && <div className="coach-msg"><p>Loading motion AI…</p></div>}
        {state === "error" && (
          <div className="coach-msg">
            <p style={{ fontWeight: 700 }}>Camera unavailable</p>
            <p style={{ fontSize: ".82rem", opacity: .8, maxWidth: 280 }}>
              Allow camera access, or switch off Motion Coach to use the guided counter.
            </p>
          </div>
        )}
        <div className="coach-cap">
          <span className="coach-cue-dot" style={{ background: conf > 50 ? "#4ade80" : "#fbbf24" }} />
          <strong>{cue}</strong>
          <span style={{ marginLeft: "auto", opacity: .7 }}>tracking {conf}%</span>
        </div>
      </div>
    </div>
  );
}
