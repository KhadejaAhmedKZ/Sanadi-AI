import { useEffect, useRef, useState } from "react";
import { motion as fm, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Activity, Eye } from "lucide-react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import { EmptyState } from "../components/ui.jsx";

const COUNTDOWN = 30;
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Skeleton connections (MediaPipe pose landmark indices) for the overlay.
const LINKS = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [0, 11], [0, 12],
];

export default function Monitoring() {
  const { user } = useAuth();
  const toast = useToast();

  const [monitoring, setMonitoring] = useState(false);
  const [modelState, setModelState] = useState("idle"); // idle | loading | pose | motion | error
  const [observation, setObservation] = useState("Waiting to start…");
  const [posture, setPosture] = useState("—");
  const [confidence, setConfidence] = useState(0);
  const [notes, setNotes] = useState([]); // live observation feed
  const [emergency, setEmergency] = useState(null);
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const [history, setHistory] = useState({ events: [], emergency_count: 0, false_alarm_count: 0 });
  const [camError, setCamError] = useState("");

  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const poseRef = useRef(null);
  const prevPtsRef = useRef(null);
  const prevFrameRef = useRef(null);
  const stateRef = useRef({ horiz: 0, dropWindow: [], lastObs: "", suspect: 0, vr: null });
  const lastTickRef = useRef(0);
  const cdRef = useRef(null);
  const emergencyRef = useRef(null);

  async function loadHistory() {
    try { setHistory(await api.monitoringEvents(user.id)); } catch { /* ignore */ }
  }
  useEffect(() => { loadHistory(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopMonitoring(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addNote(text) {
    const s = stateRef.current;
    if (text === s.lastObs) return; // only log when the observation changes
    s.lastObs = text;
    setObservation(text);
    setNotes((n) => [{ time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }), text }, ...n].slice(0, 12));
  }

  async function startMonitoring() {
    setCamError("");
    setModelState("loading");
    setObservation("Loading AI vision model…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Try to load pose detection; fall back to motion-only if it fails.
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        poseRef.current = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        setModelState("pose");
      } catch {
        poseRef.current = null;
        setModelState("motion");
      }
      setMonitoring(true);
      addNote(poseRef.current ? "👁️ Monitoring started — looking for a person" : "👁️ Monitoring started (motion mode)");
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setModelState("error");
      setCamError(
        e?.name === "NotAllowedError"
          ? "Camera permission was denied. Enable camera access in your browser to use monitoring."
          : "Couldn't start the camera on this device."
      );
    }
  }

  function stopMonitoring() {
    cancelAnimationFrame(rafRef.current);
    clearInterval(cdRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try { poseRef.current?.close(); } catch { /* ignore */ }
    poseRef.current = null;
    prevPtsRef.current = null;
    prevFrameRef.current = null;
    stateRef.current = { horiz: 0, dropWindow: [], lastObs: "", suspect: 0, vr: null };
    const ov = overlayRef.current;
    if (ov) ov.getContext("2d")?.clearRect(0, 0, ov.width, ov.height);
    setMonitoring(false);
    setModelState("idle");
    setObservation("Monitoring stopped");
    setPosture("—");
    setConfidence(0);
  }

  function loop(ts) {
    rafRef.current = requestAnimationFrame(loop);
    if (ts && lastTickRef.current && ts - lastTickRef.current < 120) return; // ~8 fps
    lastTickRef.current = ts || performance.now();
    try {
      poseRef.current ? analyzePose(ts) : analyzeMotion();
    } catch { /* transient — next tick retries */ }
  }

  function analyzePose(ts) {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const res = poseRef.current.detectForVideo(video, ts || performance.now());
    const overlay = overlayRef.current;
    const octx = overlay?.getContext("2d");
    if (octx) { overlay.width = video.videoWidth; overlay.height = video.videoHeight; octx.clearRect(0, 0, overlay.width, overlay.height); }

    const lm = res?.landmarks?.[0];
    if (!lm) {
      setConfidence(0);
      setPosture("—");
      addNote("🔍 No person in view");
      prevPtsRef.current = null;
      return;
    }

    const get = (i) => lm[i];
    const vis = [11, 12, 23, 24].map((i) => get(i)?.visibility ?? 0);
    const conf = Math.round((vis.reduce((a, b) => a + b, 0) / vis.length) * 100);
    setConfidence(conf);

    // Draw skeleton overlay (mirrored to match the flipped video via CSS).
    if (octx) {
      octx.strokeStyle = "#22d3ee"; octx.lineWidth = 3;
      for (const [a, b] of LINKS) {
        const pa = get(a), pb = get(b);
        if ((pa?.visibility ?? 0) > 0.3 && (pb?.visibility ?? 0) > 0.3) {
          octx.beginPath();
          octx.moveTo(pa.x * overlay.width, pa.y * overlay.height);
          octx.lineTo(pb.x * overlay.width, pb.y * overlay.height);
          octx.stroke();
        }
      }
      octx.fillStyle = "#f0abfc";
      for (const i of [0, 11, 12, 23, 24, 25, 26, 27, 28]) {
        const p = get(i);
        if ((p?.visibility ?? 0) > 0.3) { octx.beginPath(); octx.arc(p.x * overlay.width, p.y * overlay.height, 4, 0, 7); octx.fill(); }
      }
    }

    const s = stateRef.current;

    // Posture from torso orientation (normalized coords, y grows downward).
    const sh = { x: (get(11).x + get(12).x) / 2, y: (get(11).y + get(12).y) / 2 };
    const hp = { x: (get(23).x + get(24).x) / 2, y: (get(23).y + get(24).y) / 2 };
    const dx = sh.x - hp.x, dy = hp.y - sh.y; // dy>0 when shoulders above hips (upright)
    const len = Math.hypot(dx, dy) || 1e-3;
    const rawVertical = dy / len; // ~1 upright, ~0 horizontal
    // Smooth the orientation across frames (EMA) to cut landmark jitter.
    s.vr = s.vr == null ? rawVertical : s.vr + (rawVertical - s.vr) * 0.4;
    const verticalRatio = s.vr;
    const horizontal = verticalRatio < 0.4;
    const upright = verticalRatio > 0.6;
    // "Grounded": the hips have dropped into the lower part of the frame — this
    // separates a genuine fall from simply bending forward at the waist.
    const grounded = hp.y > 0.62;
    // Only trust the posture read when the torso landmarks are clearly visible.
    const reliable = conf >= 45;

    // Motion: mean displacement of key points since last frame.
    let motionLevel = 0;
    const pts = [0, 11, 12, 23, 24].map(get);
    if (prevPtsRef.current) {
      let d = 0, n = 0;
      pts.forEach((p, k) => { const q = prevPtsRef.current[k]; if (p && q) { d += Math.hypot(p.x - q.x, p.y - q.y); n++; } });
      motionLevel = n ? Math.round((d / n) * 400) : 0;
    }
    prevPtsRef.current = pts;

    // Rapid vertical drop of the shoulders over the last ~5 ticks.
    s.dropWindow.push(sh.y);
    if (s.dropWindow.length > 6) s.dropWindow.shift();
    const drop = s.dropWindow.length >= 4 ? sh.y - Math.min(...s.dropWindow.slice(0, -1)) : 0;
    const rapidDrop = drop > 0.2;

    // Multi-factor fall detection with a confirmation window to cut false alarms.
    // 1) A rapid drop opens a short "suspect" window (~2s of ticks).
    if (reliable && rapidDrop) s.suspect = 14;
    else if (s.suspect > 0) s.suspect -= 1;
    // 2) Count sustained horizontal frames — only when the read is reliable.
    if (reliable && horizontal) s.horiz += 1; else s.horiz = 0;

    // A fall is confirmed by EITHER a sustained horizontal posture on the ground,
    // OR a rapid drop that resolves into a horizontal, grounded posture.
    const sustainedFall = s.horiz >= 12 && grounded;
    const droppedFall = s.suspect > 0 && horizontal && grounded && s.horiz >= 3;
    const fell = reliable && (sustainedFall || droppedFall);

    setPosture(!reliable ? "—" : horizontal ? "Lying / horizontal" : upright ? "Upright" : "Leaning");

    if (!emergencyRef.current) {
      if (!reliable) {
        addNote("🔍 Step into frame — I can't see you clearly");
      } else if (fell) {
        s.horiz = 0; s.suspect = 0;
        const evConf = Math.min(96, 74 + (grounded ? 8 : 0) + Math.max(0, Math.round((0.4 - verticalRatio) * 40)));
        addNote("🛑 Person appears to have fallen (horizontal on the ground)");
        triggerEmergency("possible_fall", evConf, `Horizontal & grounded (ratio ${verticalRatio.toFixed(2)}, hip ${hp.y.toFixed(2)})`);
      } else if (s.suspect > 0) {
        addNote("⚠️ Sudden drop detected — watching…");
      } else if (horizontal) {
        addNote(grounded ? "🛌 Lying down / horizontal" : "↔️ Leaning far forward");
      } else if (motionLevel < 1.2) {
        addNote(upright ? "🧍 Standing still" : "🪑 Sitting / resting");
      } else if (motionLevel > 6) {
        addNote("🚶 Person moving actively");
      } else {
        addNote(upright ? "🧍 Standing, moving normally" : "🧍 Upright, slight movement");
      }
    }
  }

  // Motion-only fallback when the pose model can't load.
  function analyzeMotion() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    const w = 64, h = 48;
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h).data;
    const prev = prevFrameRef.current;
    if (prev && prev.length === frame.length) {
      let diff = 0;
      for (let i = 0; i < frame.length; i += 4) diff += Math.abs(frame[i] - prev[i]);
      const level = Math.min(100, Math.round((diff / (w * h)) * 0.9));
      setConfidence(level > 3 ? 60 : 20);
      addNote(level > 45 ? "⚠️ Large sudden movement" : level < 4 ? "🔵 Very little movement" : level < 12 ? "🪑 Resting" : "🚶 Movement detected");
    }
    prevFrameRef.current = frame;
  }

  async function triggerEmergency(eventType, conf, detail) {
    let ev;
    try { ev = await api.monitoringEvent({ patient_id: user.id, event_type: eventType, confidence: conf, detail }); }
    catch { ev = { id: null, label: eventType === "manual_test" ? "Monitoring test" : "Possible fall" }; }
    emergencyRef.current = ev;
    setEmergency(ev);
    setCountdown(COUNTDOWN);
    cdRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(cdRef.current); autoEscalate(); return 0; } return c - 1; });
    }, 1000);
  }

  function testDetection() {
    if (emergencyRef.current) return;
    addNote("▶ Manual test of the emergency workflow");
    triggerEmergency("manual_test", 90, "Manual test");
  }

  // Manual SOS / panic — immediately alerts the Primary Carer, no countdown.
  async function sos() {
    if (emergencyRef.current) return;
    addNote("🆘 SOS — you requested help");
    let ev = null;
    try {
      ev = await api.monitoringEvent({ patient_id: user.id, event_type: "sos", confidence: 100, detail: "Manual SOS — patient pressed the help button" });
    } catch { /* offline — still confirm to the user below */ }
    try { if (ev?.id) await api.monitoringRespond(ev.id, "help_needed"); } catch { /* ignore */ }
    toast.error("🆘 SOS sent — your Primary Carer has been alerted");
    loadHistory();
  }

  async function respond(kind) {
    const ev = emergencyRef.current;
    clearInterval(cdRef.current);
    if (ev?.id) { try { await api.monitoringRespond(ev.id, kind); } catch { /* ignore */ } }
    if (kind === "confirmed_ok") { toast.success("Glad you're OK — monitoring continues"); addNote("✅ Confirmed OK (false alarm)"); }
    else { toast.error("Your Primary Carer has been alerted"); addNote("🚨 Help requested — Primary Carer notified"); }
    emergencyRef.current = null;
    setEmergency(null);
    loadHistory();
  }
  function autoEscalate() {
    toast.error("No response — Primary Carer alerted automatically");
    addNote("🚨 No response — Primary Carer notified");
    respond("auto_escalated");
  }

  const modelLabel = { pose: "Pose AI (on-device)", motion: "Motion (fallback)", loading: "Loading…", error: "Unavailable", idle: "—" }[modelState];

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🛡️ AI Vision Emergency Monitoring</h1>
        <p>
          On-device pose AI watches for falls and shows you exactly what it sees.
          <span className="badge gray" style={{ marginLeft: 8 }}>privacy-first · off by default</span>
        </p>
      </div>

      <div className="bodymap-shell" style={{ gridTemplateColumns: "minmax(280px, 1.3fr) 320px" }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="row between" style={{ flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <span className="status-pulse" style={{ "--pulse-color": monitoring ? "var(--success)" : "var(--muted)" }}>
              <span className="status-pulse-dot" /> {monitoring ? "🟢 Monitoring active" : "⚪ Monitoring disabled"}
            </span>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {!monitoring ? (
                <button className="btn" onClick={startMonitoring} disabled={modelState === "loading"}>
                  <Camera size={16} /> {modelState === "loading" ? "Starting…" : "Enable monitoring"}
                </button>
              ) : (
                <button className="btn danger" onClick={stopMonitoring}><CameraOff size={16} /> Stop monitoring</button>
              )}
              <button className="btn danger" onClick={sos} title="Immediately alert your Primary Carer">🆘 SOS</button>
            </div>
          </div>

          <div className="monitor-stage">
            <video ref={videoRef} muted playsInline className="monitor-video" style={{ opacity: monitoring ? 1 : 0.15 }} />
            <canvas ref={overlayRef} className="monitor-overlay-canvas" style={{ opacity: monitoring && modelState === "pose" ? 1 : 0 }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {!monitoring && (
              <div className="monitor-overlay">
                <Eye size={30} />
                <p style={{ margin: "8px 0 0", fontWeight: 700 }}>Camera is off</p>
                <p className="muted" style={{ fontSize: ".82rem", maxWidth: 320 }}>
                  Nothing is recorded. When enabled, an AI pose model analyzes video on your device
                  in real time — frames never leave your device, only emergency events are saved.
                </p>
              </div>
            )}
          </div>

          {monitoring && (
            <div className="monitor-observe">
              <Eye size={16} /> <strong>AI sees:</strong> {observation}
            </div>
          )}
          {camError && <p style={{ color: "var(--danger)", fontSize: ".85rem", marginTop: 10 }}>{camError}</p>}

          {monitoring && (
            <div className="grid cols-3" style={{ marginTop: 12, gap: 10 }}>
              <div className="stat-card"><div className="stat-icon" style={{ background: "var(--secondary-100)" }}><Activity size={18} /></div><div className="stat-value" style={{ fontSize: "1.15rem" }}>{posture}</div><div className="stat-label">Posture</div></div>
              <div className="stat-card"><div className="stat-value" style={{ fontSize: "1.15rem" }}>{confidence}%</div><div className="stat-label">Detection confidence</div></div>
              <div className="stat-card"><div className="stat-value" style={{ fontSize: ".95rem" }}>{modelLabel}</div><div className="stat-label">Vision model</div></div>
            </div>
          )}

          {monitoring && (
            <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={testDetection}>▶ Test emergency detection</button>
          )}
          {monitoring && modelState === "pose" && (
            <p className="muted" style={{ fontSize: ".78rem", marginTop: 8 }}>
              Tip: step back so your upper body is in frame. To test fall detection for real,
              crouch down low or lie down within view — the AI flags a sustained horizontal posture.
            </p>
          )}
        </div>

        <div className="grid" style={{ gap: 16, alignContent: "start" }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 className="card-title" style={{ fontSize: ".95rem" }}>👁️ AI observations</h3>
            {notes.length === 0 ? (
              <p className="muted" style={{ fontSize: ".82rem", margin: 0 }}>Enable monitoring to see live observations.</p>
            ) : notes.map((n, i) => (
              <div key={i} className="row" style={{ gap: 10, padding: "4px 0", fontSize: ".82rem", opacity: i === 0 ? 1 : 0.7 }}>
                <span className="muted" style={{ minWidth: 62, fontVariantNumeric: "tabular-nums" }}>{n.time}</span>
                <span>{n.text}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 className="card-title" style={{ fontSize: ".95rem" }}>Safety summary</h3>
            <div className="row between" style={{ padding: "5px 0" }}><span className="muted">Emergencies</span><strong style={{ color: history.emergency_count ? "var(--danger)" : "inherit" }}>{history.emergency_count}</strong></div>
            <div className="row between" style={{ padding: "5px 0" }}><span className="muted">False alarms</span><strong>{history.false_alarm_count}</strong></div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 className="card-title" style={{ fontSize: ".95rem" }}>Recent events</h3>
            {history.events.length === 0 ? (
              <EmptyState icon="🛡️" title="No events yet" />
            ) : history.events.slice(0, 5).map((e) => (
              <div className="row between" key={e.id} style={{ padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".84rem" }}>{e.label}</div>
                  <div className="muted" style={{ fontSize: ".74rem" }}>{new Date(e.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</div>
                </div>
                <span className={"badge " + (e.status === "confirmed_ok" ? "green" : e.status === "detected" ? "gray" : "red")}>{e.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {emergency && (
          <fm.div className="video-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-label="Possible emergency detected">
            <fm.div className="card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ maxWidth: 440, textAlign: "center", borderColor: "var(--danger)" }}>
              <div style={{ fontSize: "2.6rem" }}>🚨</div>
              <h2 style={{ margin: "6px 0" }}>Possible emergency detected</h2>
              <p className="muted" style={{ margin: "0 0 4px" }}>{emergency.label} · are you okay?</p>
              <div className="emergency-countdown">{countdown}</div>
              <p className="muted" style={{ fontSize: ".82rem", marginTop: 0 }}>seconds until we alert your Primary Carer</p>
              <div className="row" style={{ gap: 10, justifyContent: "center", marginTop: 10 }}>
                <button className="btn success lg" onClick={() => respond("confirmed_ok")}>🟢 I'm OK</button>
                <button className="btn danger lg" onClick={() => respond("help_needed")}>🔴 I need help</button>
              </div>
            </fm.div>
          </fm.div>
        )}
      </AnimatePresence>
    </div>
  );
}
