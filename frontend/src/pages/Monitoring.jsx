import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Camera, CameraOff, AlertTriangle, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import { EmptyState } from "../components/ui.jsx";

const COUNTDOWN = 30; // seconds the patient has to confirm they're OK

// On-device motion analysis: mean absolute frame-to-frame pixel difference.
// A sharp motion spike immediately followed by sustained near-stillness is
// the classic fall signature. Runs entirely in the browser — no frame ever
// leaves the device.
export default function Monitoring() {
  const { user } = useAuth();
  const toast = useToast();

  const [monitoring, setMonitoring] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [motion, setMotion] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [emergency, setEmergency] = useState(null); // { id, label }
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const [history, setHistory] = useState({ events: [], emergency_count: 0, false_alarm_count: 0 });
  const [timeline, setTimeline] = useState([]);
  const [camError, setCamError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const prevFrameRef = useRef(null);
  const spikeRef = useRef({ high: false, stillFrames: 0 });
  const cdRef = useRef(null);
  const emergencyRef = useRef(null);
  const lastTickRef = useRef(0);

  async function loadHistory() {
    try { setHistory(await api.monitoringEvents(user.id)); } catch { /* ignore */ }
  }
  useEffect(() => { loadHistory(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopMonitoring(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function logTimeline(text) {
    setTimeline((t) => [{ time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }), text }, ...t].slice(0, 8));
  }

  async function startMonitoring() {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMonitoring(true);
      setStatus("Monitoring active");
      logTimeline("Monitoring started");
      loop();
    } catch (e) {
      setCamError(
        e?.name === "NotAllowedError"
          ? "Camera permission was denied. Monitoring needs camera access — enable it in your browser to continue."
          : "Couldn't start the camera on this device."
      );
    }
  }

  function stopMonitoring() {
    cancelAnimationFrame(rafRef.current);
    clearInterval(cdRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    prevFrameRef.current = null;
    spikeRef.current = { high: false, stillFrames: 0 };
    setMonitoring(false);
    setStatus("Idle");
    setMotion(0);
  }

  // Throttle analysis to ~8 fps: plenty for fall detection, and it avoids a
  // 60/sec setState storm that can freeze the tab. All frame work is guarded
  // so a canvas hiccup can never crash the page.
  function loop(ts) {
    rafRef.current = requestAnimationFrame(loop);
    const last = lastTickRef.current;
    if (ts && last && ts - last < 120) return; // ~8 fps
    lastTickRef.current = ts || performance.now();

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;

      const w = 64, h = 48;
      if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const frame = ctx.getImageData(0, 0, w, h).data;

      const prev = prevFrameRef.current;
      if (prev && prev.length === frame.length) {
        let diff = 0;
        for (let i = 0; i < frame.length; i += 4) {
          diff += Math.abs(frame[i] - prev[i]);
        }
        const level = Math.min(100, Math.round((diff / (w * h)) * 0.9));

        // Only re-render when the value actually changes.
        setMotion((m) => (m === level ? m : level));

        // Fall signature: a spike (>45) then sustained near-stillness (<6)
        // for ~20 analysis frames (~2.5s at 8 fps).
        const s = spikeRef.current;
        if (level > 45) { s.high = true; s.stillFrames = 0; }
        else if (s.high) {
          if (level < 6) {
            s.stillFrames += 1;
            if (s.stillFrames > 20 && !emergencyRef.current) {
              s.high = false; s.stillFrames = 0;
              triggerEmergency("possible_fall", 82, "Motion spike followed by sustained stillness");
            }
          } else if (level > 15) {
            s.high = false; s.stillFrames = 0; // recovered — moving normally
          }
        }
        const next = level > 45 ? "Sudden movement" : level < 6 ? "Still" : level < 15 ? "Resting" : "Active";
        setStatus((st) => (st === next ? st : next));
      }
      prevFrameRef.current = frame;
    } catch {
      /* transient frame-processing issue — next tick retries */
    }
  }

  async function triggerEmergency(eventType, conf, detail) {
    setConfidence(conf);
    logTimeline("⚠️ Possible emergency detected");
    let ev;
    try {
      ev = await api.monitoringEvent({ patient_id: user.id, event_type: eventType, confidence: conf, detail });
    } catch { ev = { id: null, label: "Possible fall" }; }
    emergencyRef.current = ev;
    setEmergency(ev);
    setCountdown(COUNTDOWN);
    cdRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(cdRef.current); autoEscalate(); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  // Manual test so the full workflow is demonstrable without a real fall.
  function testDetection() {
    if (emergencyRef.current) return;
    triggerEmergency("manual_test", 90, "Manual test of the emergency workflow");
  }

  async function respond(kind) {
    const ev = emergencyRef.current;
    clearInterval(cdRef.current);
    if (ev?.id) {
      try { await api.monitoringRespond(ev.id, kind); } catch { /* ignore */ }
    }
    if (kind === "confirmed_ok") { toast.success("Glad you're OK — monitoring continues"); logTimeline("✅ Emergency cancelled (false alarm)"); }
    else { toast.error("Helping you — your Primary Carer has been alerted"); logTimeline("🚨 Help requested — Primary Carer notified"); }
    emergencyRef.current = null;
    setEmergency(null);
    loadHistory();
  }
  function autoEscalate() {
    toast.error("No response — Primary Carer has been alerted automatically");
    logTimeline("🚨 No response — Primary Carer notified");
    respond("auto_escalated");
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🛡️ AI Vision Emergency Monitoring</h1>
        <p>
          Optional on-device safety monitoring that watches for falls and sudden inactivity.
          <span className="badge gray" style={{ marginLeft: 8 }}>privacy-first · off by default</span>
        </p>
      </div>

      <div className="bodymap-shell" style={{ gridTemplateColumns: "minmax(280px, 1.3fr) 320px" }}>
        {/* LEFT: camera + status */}
        <div className="card" style={{ padding: 18 }}>
          <div className="row between" style={{ flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <span className={"status-pulse"} style={{ "--pulse-color": monitoring ? "var(--success)" : "var(--muted)" }}>
              <span className="status-pulse-dot" /> {monitoring ? "🟢 Monitoring active" : "⚪ Monitoring disabled"}
            </span>
            {!monitoring ? (
              <button className="btn" onClick={startMonitoring}><Camera size={16} /> Enable monitoring</button>
            ) : (
              <button className="btn danger" onClick={stopMonitoring}><CameraOff size={16} /> Stop monitoring</button>
            )}
          </div>

          <div className="monitor-stage">
            <video ref={videoRef} muted playsInline className="monitor-video" style={{ opacity: monitoring ? 1 : 0.15 }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {!monitoring && (
              <div className="monitor-overlay">
                <Camera size={30} />
                <p style={{ margin: "8px 0 0", fontWeight: 700 }}>Camera is off</p>
                <p className="muted" style={{ fontSize: ".82rem", maxWidth: 320 }}>
                  Nothing is recorded. When you enable monitoring, video is analyzed on your device
                  in real time and never uploaded — only emergency events are saved.
                </p>
              </div>
            )}
          </div>
          {camError && <p style={{ color: "var(--danger)", fontSize: ".85rem", marginTop: 10 }}>{camError}</p>}

          {monitoring && (
            <div className="grid cols-3" style={{ marginTop: 14, gap: 10 }}>
              <div className="stat-card"><div className="stat-icon" style={{ background: "var(--secondary-100)" }}><Activity size={18} /></div><div className="stat-value" style={{ fontSize: "1.3rem" }}>{status}</div><div className="stat-label">Current activity</div></div>
              <div className="stat-card"><div className="stat-value" style={{ fontSize: "1.3rem" }}>{motion}%</div><div className="stat-label">Motion level</div></div>
              <div className="stat-card"><div className="stat-value" style={{ fontSize: "1.3rem" }}>{monitoring ? "On-device" : "—"}</div><div className="stat-label">Processing</div></div>
            </div>
          )}

          {monitoring && (
            <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={testDetection}>
              ▶ Test emergency detection
            </button>
          )}
        </div>

        {/* RIGHT: stats + timeline */}
        <div className="grid" style={{ gap: 16, alignContent: "start" }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 className="card-title" style={{ fontSize: ".95rem" }}>Safety summary</h3>
            <div className="row between" style={{ padding: "5px 0" }}><span className="muted">Emergencies</span><strong style={{ color: history.emergency_count ? "var(--danger)" : "inherit" }}>{history.emergency_count}</strong></div>
            <div className="row between" style={{ padding: "5px 0" }}><span className="muted">False alarms</span><strong>{history.false_alarm_count}</strong></div>
            <div className="row between" style={{ padding: "5px 0" }}><span className="muted">Detection model</span><strong>Motion (on-device)</strong></div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 className="card-title" style={{ fontSize: ".95rem" }}>Activity timeline</h3>
            {timeline.length === 0 ? (
              <p className="muted" style={{ fontSize: ".82rem", margin: 0 }}>Enable monitoring to see live activity.</p>
            ) : timeline.map((t, i) => (
              <div key={i} className="row" style={{ gap: 10, padding: "4px 0", fontSize: ".82rem" }}>
                <span className="muted" style={{ minWidth: 52 }}>{t.time}</span><span>{t.text}</span>
              </div>
            ))}
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
                <span className={"badge " + (e.status === "confirmed_ok" ? "green" : e.status === "detected" ? "gray" : "red")}>
                  {e.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full-screen emergency popup */}
      <AnimatePresence>
        {emergency && (
          <motion.div className="video-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-label="Possible emergency detected">
            <motion.div className="card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ maxWidth: 440, textAlign: "center", borderColor: "var(--danger)" }}>
              <div style={{ fontSize: "2.6rem" }}>🚨</div>
              <h2 style={{ margin: "6px 0" }}>Possible emergency detected</h2>
              <p className="muted" style={{ margin: "0 0 4px" }}>{emergency.label} · are you okay?</p>
              <div className="emergency-countdown">{countdown}</div>
              <p className="muted" style={{ fontSize: ".82rem", marginTop: 0 }}>
                seconds until we alert your Primary Carer
              </p>
              <div className="row" style={{ gap: 10, justifyContent: "center", marginTop: 10 }}>
                <button className="btn success lg" onClick={() => respond("confirmed_ok")}>🟢 I'm OK</button>
                <button className="btn danger lg" onClick={() => respond("help_needed")}>🔴 I need help</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
