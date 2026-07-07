import { useEffect, useRef, useState } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useAccessibility } from "../context/AccessibilityContext.jsx";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const LINKS = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28], [0, 11], [0, 12],
];
const SIDES = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
};

function angle(a, b, c) {
  if (!a || !b || !c) return null;
  const ab = { x: a.x - b.x, y: a.y - b.y }, cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1e-6;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}
const dist = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);
const lerp = (a, b, t) => a + (b - a) * t;

// Instructor "standing, facing us" base pose (MediaPipe indices, 0..1).
const BASE = {
  0: [0.50, 0.12], 11: [0.62, 0.28], 12: [0.38, 0.28], 13: [0.66, 0.45], 14: [0.34, 0.45],
  15: [0.68, 0.60], 16: [0.32, 0.60], 23: [0.57, 0.56], 24: [0.43, 0.56],
  25: [0.57, 0.76], 26: [0.43, 0.76], 27: [0.57, 0.94], 28: [0.43, 0.94],
};
const clonePose = () => Object.fromEntries(Object.entries(BASE).map(([k, v]) => [k, { x: v[0], y: v[1] }]));

// Each exercise: how the instructor animates (right side), the joint to score,
// how to measure it, rep thresholds for the patient, coaching direction, and
// which joints to highlight.
const EX = {
  "knee-flexion": {
    title: "Bend and straighten the knee",
    highlight: [26], type: "cycle", joints: ["hip", "knee", "ankle"],
    animate: (p, ph) => { p[28].x = lerp(0.43, 0.50, ph); p[28].y = lerp(0.94, 0.80, ph); }, // raise shin
    signal: (lm, S) => angle(lm[S.hip], lm[S.knee], lm[S.ankle]),
    active: (v) => v < 115, rest: (v) => v > 150, target: [165, 100],
    cue: (d) => (d > 18 ? "Bend your knee more" : d < -18 ? "Ease off a little" : "Perfect knee bend"),
  },
  "shoulder-raise": {
    title: "Raise the arm, then lower with control",
    highlight: [12], type: "cycle", joints: ["hip", "shoulder", "elbow"],
    animate: (p, ph) => { p[14].x = lerp(0.34, 0.30, ph); p[14].y = lerp(0.45, 0.30, ph); p[16].x = lerp(0.32, 0.24, ph); p[16].y = lerp(0.60, 0.16, ph); },
    signal: (lm, S) => angle(lm[S.hip], lm[S.shoulder], lm[S.elbow]),
    active: (v) => v > 70, rest: (v) => v < 40, target: [15, 95],
    cue: (d) => (d > 18 ? "Raise your arm higher" : d < -18 ? "Lower a little" : "Great arm position"),
  },
  "balance-reach": {
    title: "Reach out, keep your balance, return",
    highlight: [12, 16], type: "cycle", joints: ["shoulder", "wrist"],
    animate: (p, ph) => { p[14].x = lerp(0.34, 0.22, ph); p[16].x = lerp(0.32, 0.12, ph); p[16].y = lerp(0.60, 0.52, ph); },
    signal: (lm, S) => dist(lm[S.shoulder], lm[S.wrist]),
    active: (v) => v > 0.30, rest: (v) => v < 0.22, target: [0.16, 0.34],
    cue: (d) => (d > 0.06 ? "Reach out further" : d < -0.06 ? "Bring it back in" : "Nice steady reach"),
  },
  "ankle-circles": {
    title: "Lift and circle the ankle",
    highlight: [28], type: "motion", joints: ["knee", "ankle"],
    animate: (p, ph) => { const a = ph * Math.PI * 2; p[28].x = 0.43 + Math.cos(a) * 0.04; p[28].y = 0.90 + Math.sin(a) * 0.04; },
    signal: (lm, S) => (lm[S.ankle] && lm[S.knee] ? lm[S.knee].y - lm[S.ankle].y : null),
    cue: () => "Keep circling smoothly",
  },
  "grip-strength": {
    title: "Squeeze and release rhythmically",
    highlight: [16], type: "motion", joints: ["wrist", "elbow"],
    animate: (p, ph) => { p[16].y = 0.60 - Math.abs(Math.sin(ph * Math.PI)) * 0.05; },
    signal: (lm, S) => (lm[S.wrist] && lm[S.elbow] ? dist(lm[S.wrist], lm[S.elbow]) : null),
    cue: () => "Keep the rhythm",
  },
};

function bestSide(lm, cfg) {
  const need = cfg.type === "cycle" ? ["shoulder", "hip", "knee", "ankle", "elbow", "wrist"] : ["knee", "ankle", "elbow", "wrist"];
  const score = (s) => need.reduce((a, k) => a + (lm[SIDES[s][k]]?.visibility ?? 0), 0);
  return score("left") >= score("right") ? SIDES.left : SIDES.right;
}
const ema = (prev, next, a = 0.25) => Math.round(prev + (next - prev) * a);

export default function RehabCoach({ exerciseId, running, view, speed, onRep, onScore }) {
  const cfg = EX[exerciseId] || EX["knee-flexion"];
  const { speak, settings } = useAccessibility();
  const [state, setState] = useState("loading"); // loading | ready | error
  const [cue, setCue] = useState("Watch the coach, then copy the movement");
  const [scores, setScores] = useState({ accuracy: 0, rom: 0, posture: 0, overall: 0 });

  const videoRef = useRef(null);
  const instrRef = useRef(null);
  const patRef = useRef(null);
  const poseRef = useRef(null), streamRef = useRef(null), rafRef = useRef(null);
  const lastTickRef = useRef(0), phaseRef = useRef(0), lastPhaseTsRef = useRef(0);
  const repRef = useRef({ armed: false, band: [], dir: 0, at: 0 });
  const romRef = useRef({ min: Infinity, max: -Infinity });
  const scoreRef = useRef({ accuracy: 0, rom: 0, posture: 0, overall: 0 });
  const spokeRef = useRef(0);
  const propsRef = useRef({ running, view, speed });
  propsRef.current = { running, view, speed };
  const cbRef = useRef({ onRep, onScore });
  cbRef.current = { onRep, onScore };

  useEffect(() => {
    let cancelled = false;
    repRef.current = { armed: false, band: [], dir: 0, at: 0 };
    romRef.current = { min: Infinity, max: -Infinity };
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
        setState("ready");
        rafRef.current = requestAnimationFrame(loop);
      } catch { setState("error"); }
    }
    boot();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      try { poseRef.current?.close(); } catch { /* ignore */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- instructor drawing ----
  function project([x, y], vw) {
    if (vw === "side") return [0.5 + (x - 0.5) * 0.45 + (y - 0.5) * 0.12, y]; // ¾ profile
    return [x, y];
  }
  function drawSkeleton(ctx, W, H, getPt, opts) {
    const { limb = "#38bdf8", joint = "#e2e8f0", highlight = [], hlColor = "#3b82f6" } = opts;
    ctx.lineCap = "round"; ctx.lineWidth = 7; ctx.strokeStyle = limb;
    for (const [a, b] of LINKS) {
      const pa = getPt(a), pb = getPt(b);
      if (pa && pb) { ctx.beginPath(); ctx.moveTo(pa[0] * W, pa[1] * H); ctx.lineTo(pb[0] * W, pb[1] * H); ctx.stroke(); }
    }
    ctx.fillStyle = joint;
    for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      const p = getPt(i); if (p) { ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 5, 0, 7); ctx.fill(); }
    }
    for (const i of highlight) {
      const p = getPt(i); if (p) { ctx.shadowColor = hlColor; ctx.shadowBlur = 22; ctx.fillStyle = hlColor; ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 11, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
    }
  }

  function paintBg(ctx, W, H, tint) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tint || "#0b1220"); g.addColorStop(1, "#111a2e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H * 0.94); ctx.lineTo(W, H * 0.94); ctx.stroke();
  }

  function loop(ts) {
    rafRef.current = requestAnimationFrame(loop);
    if (ts && lastTickRef.current && ts - lastTickRef.current < 66) return; // ~15 fps
    const dt = lastTickRef.current ? (ts - lastTickRef.current) / 1000 : 0;
    lastTickRef.current = ts || performance.now();
    try { tick(ts, dt); } catch { /* transient */ }
  }

  function tick(ts, dt) {
    const { running, view, speed } = propsRef.current;
    // advance instructor phase (oscillating 0→1→0) when running
    if (running) {
      const period = 2.6 / (speed || 1); // seconds per full rep
      phaseRef.current = (phaseRef.current + dt / period) % 1;
    }
    const ph = 0.5 - 0.5 * Math.cos(phaseRef.current * Math.PI * 2); // ease 0..1..0

    // ---- INSTRUCTOR ----
    const instr = clonePose();
    cfg.animate(instr, phaseRef.current);
    const iC = instrRef.current, iCtx = iC?.getContext("2d");
    if (iCtx) {
      const W = 360, H = 420; if (iC.width !== W) { iC.width = W; iC.height = H; }
      paintBg(iCtx, W, H, "#0e1a2e");
      drawSkeleton(iCtx, W, H, (i) => (instr[i] ? project([instr[i].x, instr[i].y], view) : null), { limb: "#38bdf8", highlight: cfg.highlight, hlColor: "#3b82f6" });
    }
    // instructor target signal (front coords)
    const iLm = Object.fromEntries(Object.entries(instr).map(([k, v]) => [k, { x: v.x, y: v.y, visibility: 1 }]));
    const targetSig = cfg.signal(iLm, SIDES.right);

    // ---- PATIENT ----
    const video = videoRef.current, pose = poseRef.current;
    let lm = null, side = SIDES.right, conf = 0, patientSig = null, matchOk = false;
    if (video && pose && video.readyState >= 2) {
      const res = pose.detectForVideo(video, ts || performance.now());
      lm = res?.landmarks?.[0] || null;
    }
    const pC = patRef.current, pCtx = pC?.getContext("2d");
    if (pCtx) { const W = 360, H = 420; if (pC.width !== W) { pC.width = W; pC.height = H; } paintBg(pCtx, W, H, "#0b1220"); }

    if (lm) {
      side = bestSide(lm, cfg);
      // Confidence from exactly the joints this exercise scores, so a poorly-seen
      // limb can't corrupt the reading. Frames where any scored joint is unclear
      // are skipped rather than folded into the score.
      const scoreKeys = cfg.joints || ["shoulder", "hip"];
      const jointVis = scoreKeys.map((k) => lm[side[k]]?.visibility ?? 0);
      conf = Math.round((jointVis.reduce((a, b) => a + b, 0) / (jointVis.length || 1)) * 100);
      const reliable = jointVis.length > 0 && Math.min(...jointVis) >= 0.5;
      patientSig = cfg.signal(lm, side);

      // scoring — only fold in frames where every scored joint is clearly visible
      const s = scoreRef.current;
      if (reliable && patientSig != null && targetSig != null && cfg.type === "cycle") {
        const scale = cfg.target ? Math.max(1e-3, Math.abs(cfg.target[0] - cfg.target[1])) : 60;
        const delta = Math.abs(patientSig - targetSig) / scale;
        const acc = Math.max(0, Math.min(100, Math.round(100 - delta * 90)));
        matchOk = delta < 0.35;
        // Adapt faster when confidence is high, slower when marginal — steadier score.
        s.accuracy = ema(s.accuracy, acc, conf >= 80 ? 0.3 : 0.18);
        // ROM: how much of the instructor's range the patient has covered
        romRef.current.min = Math.min(romRef.current.min, patientSig);
        romRef.current.max = Math.max(romRef.current.max, patientSig);
        const patRange = romRef.current.max - romRef.current.min;
        const tgtRange = Math.abs(cfg.target[0] - cfg.target[1]);
        s.rom = ema(s.rom, Math.max(0, Math.min(100, Math.round((patRange / tgtRange) * 100))));
      } else if (reliable && cfg.type === "motion") {
        matchOk = true; s.accuracy = ema(s.accuracy, 82); s.rom = ema(s.rom, 80);
      } else if (!reliable) {
        matchOk = false; // hold the score steady on low-visibility frames
      }
      // posture: torso uprightness
      const sh = lm[side.shoulder], hp = lm[side.hip];
      if (sh && hp) {
        const dy = hp.y - sh.y, dxp = sh.x - hp.x, len = Math.hypot(dxp, dy) || 1e-3;
        s.posture = ema(s.posture, Math.max(0, Math.min(100, Math.round((dy / len) * 100 + 8))));
      }
      s.overall = Math.round(s.accuracy * 0.5 + s.rom * 0.25 + s.posture * 0.25);
      setScores({ ...s });
      cbRef.current.onScore?.({ ...s });

      // draw patient skeleton, joints tinted by match
      const jc = matchOk ? "#4ade80" : "#f87171";
      drawSkeleton(pCtx, 360, 420, (i) => (lm[i] && (lm[i].visibility ?? 0) > 0.3 ? [1 - lm[i].x, lm[i].y] : null), { limb: matchOk ? "#22c55e" : "#fb923c", joint: "#e2e8f0", highlight: [side.shoulder === 12 ? 12 : 11], hlColor: jc });

      // rep detection + cue
      if (running && conf >= 30 && patientSig != null) {
        const rp = repRef.current;
        if (cfg.type === "cycle") {
          if (cfg.active(patientSig) && !rp.armed) rp.armed = true;
          else if (rp.armed && cfg.rest(patientSig)) { rp.armed = false; doRep(s.accuracy); }
          setCue(cfg.cue(patientSig - targetSig));
        } else {
          rp.band.push(patientSig); if (rp.band.length > 12) rp.band.shift();
          const lo = Math.min(...rp.band), hi = Math.max(...rp.band), mid = (hi + lo) / 2, d = patientSig > mid ? 1 : -1;
          if (hi - lo > 0.05 && d !== rp.dir && rp.dir !== 0 && d === 1) doRep(s.accuracy);
          rp.dir = d; setCue(cfg.cue());
        }
        maybeSpeak(patientSig, targetSig, ph);
      } else if (conf < 30) setCue("Step back so your whole body is in view");
      else if (!running) setCue("Press Start, then follow the coach");
    } else {
      setCue("Step into the camera view");
    }
  }

  function doRep(acc) {
    const rp = repRef.current, now = performance.now();
    if (now - rp.at < 500) return;
    rp.at = now;
    cbRef.current.onRep?.();
    if (settings.voiceEnabled || settings.screenReader) speak(acc > 80 ? "Perfect!" : "Good, keep going");
  }

  function maybeSpeak(pSig, tSig, ph) {
    if (!(settings.voiceEnabled || settings.screenReader)) return;
    const now = performance.now();
    if (now - spokeRef.current < 3500) return;
    if (ph > 0.9) { spokeRef.current = now; speak("Hold, then return slowly"); }
  }

  const dials = [
    { label: "Accuracy", icon: "🎯", v: scores.accuracy, c: "#22c55e" },
    { label: "Range", icon: "🦿", v: scores.rom, c: "#06b6d4" },
    { label: "Posture", icon: "🧍", v: scores.posture, c: "#8b5cf6" },
    { label: "Overall", icon: "⭐", v: scores.overall, c: "#2563eb" },
  ];

  return (
    <div className="rehab-coach">
      <div className="rehab-duo">
        {/* STEP 1 — the coach demonstrates */}
        <div className="rehab-pane coach">
          <div className="rehab-pane-head">
            <span className="rehab-step">1</span>
            <div>
              <div className="rehab-step-title">Watch the coach</div>
              <div className="rehab-step-sub">{cfg.title}</div>
            </div>
          </div>
          <canvas ref={instrRef} className="rehab-canvas" />
        </div>

        {/* STEP 2 — you copy it */}
        <div className="rehab-pane you">
          <div className="rehab-pane-head">
            <span className="rehab-step green">2</span>
            <div>
              <div className="rehab-step-title">Copy the movement</div>
              <div className="rehab-step-sub">Match the coach with your body</div>
            </div>
          </div>
          <canvas ref={patRef} className="rehab-canvas" />
          <video ref={videoRef} muted playsInline style={{ display: "none" }} />
          {state === "loading" && <div className="rehab-pane-msg">Loading motion AI…</div>}
          {state === "error" && <div className="rehab-pane-msg">Camera unavailable — switch off Coach Mode to use the guided view.</div>}
        </div>
      </div>

      {/* STEP 3 — AI feedback, clearly separated */}
      <div className="rehab-feedback">
        <span className="rehab-feedback-icon">💬</span>
        <div style={{ flex: 1 }}>
          <div className="rehab-feedback-label">AI feedback</div>
          <div className="rehab-feedback-text">{cue}</div>
        </div>
        <span className="coach-cue-dot" style={{ width: 12, height: 12, background: scores.accuracy > 70 ? "#4ade80" : "#fbbf24" }} />
      </div>

      {/* compact supporting stats */}
      <div className="rehab-stats">
        {dials.map((d) => (
          <div key={d.label} className="rehab-stat">
            <div className="rehab-stat-top"><span>{d.icon} {d.label}</span><b>{d.v}%</b></div>
            <div className="rehab-stat-bar"><div style={{ width: `${d.v}%`, background: d.c }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
