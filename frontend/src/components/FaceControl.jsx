import { useEffect, useRef, useState } from "react";
import { useAccessibility } from "../context/AccessibilityContext.jsx";
import { useFaceControl } from "../hooks/useFaceControl.js";

export default function FaceControl() {
  const { settings, toggle } = useAccessibility();
  const enabled = settings.faceControl;

  const videoRef = useRef(null);
  const cursorRef = useRef(null);
  const sensitivityRef = useRef(3.5);
  const blinkRef = useRef(0.5);

  const [status, setStatus] = useState("off"); // off | loading | active | error
  const [face, setFace] = useState(false);
  const [closedScore, setClosedScore] = useState(0);
  const [error, setError] = useState("");
  const [sensitivity, setSensitivity] = useState(3.5);
  const [blink, setBlink] = useState(0.5);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { blinkRef.current = blink; }, [blink]);

  function onState(s) {
    if (s.status) setStatus(s.status);
    if (s.status === "error") setError(s.error || "Error");
    if ("face" in s) setFace(s.face);
    if ("closedScore" in s) setClosedScore(s.closedScore);
  }

  useFaceControl({ enabled, videoRef, cursorRef, sensitivityRef, blinkRef, onState });

  // Launcher button (shown when face control is OFF) — available on every page.
  if (!enabled) {
    return (
      <button
        className="fc-launcher"
        onClick={() => { setError(""); toggle("faceControl"); }}
        title="Hands-free face control"
        aria-label="Activate hands-free face control"
      >
        👁️ <span>Face Control</span>
      </button>
    );
  }

  const blinkPct = Math.min(100, Math.round((closedScore / (blink || 0.5)) * 100));

  return (
    <>
      {/* Always mount the video so the stream has a sink; preview is toggleable. */}
      <video
        ref={videoRef}
        className={"fc-video" + (showPreview ? "" : " hidden")}
        playsInline
        muted
      />

      {/* On-screen head cursor */}
      <div ref={cursorRef} className="fc-cursor" aria-hidden="true">
        <span className="fc-cursor-ring" />
        <span className="fc-cursor-dot" />
      </div>

      {/* Control panel */}
      <div className="fc-panel" role="dialog" aria-label="Face control">
        <div className="fc-panel-head">
          <strong>👁️ Face Control</strong>
          <span className={"fc-status " + status}>
            {status === "loading" && "Starting…"}
            {status === "active" && (face ? "● Tracking" : "○ No face")}
            {status === "error" && "Error"}
          </span>
        </div>

        {status === "error" ? (
          <div className="fc-error">
            ⚠️ {error}
            <div className="muted" style={{ fontSize: ".8rem", marginTop: 6 }}>
              Allow camera access in your browser, then re-activate.
            </div>
          </div>
        ) : (
          <>
            <div className="fc-hint">
              Move your <b>head</b> to steer the pointer. <b>Blink</b> to tap.
            </div>

            <div className="fc-meter-wrap">
              <span className="fc-meter-label">Blink</span>
              <div className="fc-meter">
                <div
                  className="fc-meter-fill"
                  style={{ width: `${blinkPct}%`, background: blinkPct >= 100 ? "var(--health)" : "var(--brand)" }}
                />
              </div>
            </div>

            <label className="fc-slider">
              <span>Head sensitivity</span>
              <input type="range" min="2" max="7" step="0.5"
                value={sensitivity} onChange={(e) => setSensitivity(+e.target.value)} />
            </label>
            <label className="fc-slider">
              <span>Blink ease {blink <= 0.4 ? "(easier)" : blink >= 0.6 ? "(firmer)" : ""}</span>
              <input type="range" min="0.3" max="0.7" step="0.05"
                value={blink} onChange={(e) => setBlink(+e.target.value)} />
            </label>

            <div className="fc-actions">
              <button className="btn secondary sm" onClick={() => setShowPreview((p) => !p)}>
                {showPreview ? "Hide camera" : "Show camera"}
              </button>
              <button className="btn danger sm" onClick={() => toggle("faceControl")}>
                Stop
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
