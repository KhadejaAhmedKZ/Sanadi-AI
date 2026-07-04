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
  const overlayRef = useRef(null);
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

  function analyze(ts) {
    const video = videoRef.current, pose = poseRef.current;
    if (!video || !pose || video.readyState < 2) return;
    const res = pose.detectForVideo(video, ts || performance.now());
    const overlay = overlayRef.current, octx = overlay?.getContext("2d");
    if (octx) { overlay.width = video.videoWidth; overlay.height = video.videoHeight; octx.clearRect(0, 0, overlay.width, overlay.height); }

    const lm = res?.landmarks?.[0];
    if (!lm) { setConf(0); setCue("Step into the camera view"); return; }

    const side = bestSide(lm, cfg.needs);
    const vis = cfg.needs.map((k) => lm[side[k]]?.visibility ?? 0);
    const c = Math.round((vis.reduce((a, b) => a + b, 0) / vis.length) * 100);
    setConf(c);

    if (octx) {
      octx.strokeStyle = "#22d3ee"; octx.lineWidth = 3;
      for (const [a, b] of LINKS) {
        const pa = lm[a], pb = lm[b];
        if ((pa?.visibility ?? 0) > 0.3 && (pb?.visibility ?? 0) > 0.3) {
          octx.beginPath(); octx.moveTo(pa.x * overlay.width, pa.y * overlay.height); octx.lineTo(pb.x * overlay.width, pb.y * overlay.height); octx.stroke();
        }
      }
      octx.fillStyle = "#4ade80";
      for (const k of cfg.needs) { const p = lm[side[k]]; if ((p?.visibility ?? 0) > 0.3) { octx.beginPath(); octx.arc(p.x * overlay.width, p.y * overlay.height, 6, 0, 7); octx.fill(); } }
    }

    if (c < 30) { setCue("Move so the tracked joints are clearly visible"); return; }
    const v = cfg.signal(lm, side);
    if (v == null) return;
    const rs = repStateRef.current;

    if (!running) { setCue("Press Start, then begin the movement"); return; }

    if (cfg.type === "cycle") {
      const on = cfg.active(v);
      if (on && !rs.armed) rs.armed = true;
      else if (rs.armed && cfg.rest(v)) { rs.armed = false; countRep(); }
      setCue(cfg.cue(v, on));
    } else {
      // motion type: count rhythmic swings via a rolling band + amplitude.
      rs.band.push(v); if (rs.band.length > 12) rs.band.shift();
      const lo = Math.min(...rs.band), hi = Math.max(...rs.band);
      const amp = hi - lo;
      const mid = (hi + lo) / 2;
      const dir = v > mid ? 1 : -1;
      if (amp > 0.06 && dir !== rs.lastPeakDir && rs.lastPeakDir !== 0) {
        // half swing; count a rep every full swing (two direction changes)
        if (dir === 1) countRep();
      }
      rs.lastPeakDir = dir;
      setCue(cfg.cue(v, amp > 0.06));
    }
  }

  function countRep() {
    const rs = repStateRef.current;
    const now = performance.now();
    if (now - rs.lastRepAt < 500) return; // debounce
    rs.lastRepAt = now;
    onRepRef.current?.();
  }

  return (
    <div>
      <div className="monitor-stage" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} muted playsInline className="monitor-video" />
        <canvas ref={overlayRef} className="monitor-overlay-canvas" />
        {state === "loading" && (
          <div className="monitor-overlay"><p style={{ fontWeight: 700 }}>Loading motion AI…</p></div>
        )}
        {state === "error" && (
          <div className="monitor-overlay">
            <p style={{ fontWeight: 700 }}>Camera unavailable</p>
            <p className="muted" style={{ fontSize: ".82rem", maxWidth: 300 }}>
              Allow camera access to use the Motion Coach, or switch off camera mode to use the guided counter.
            </p>
          </div>
        )}
      </div>
      <div className="coach-cue">
        <span className="coach-cue-dot" style={{ background: conf > 50 ? "var(--success)" : "var(--warning)" }} />
        {cfg.label} — <strong>{cue}</strong>
        <span className="muted" style={{ marginLeft: "auto", fontSize: ".78rem" }}>tracking {conf}%</span>
      </div>
    </div>
  );
}
