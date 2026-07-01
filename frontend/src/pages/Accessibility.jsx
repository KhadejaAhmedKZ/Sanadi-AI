import { useState } from "react";
import { useAccessibility } from "../context/AccessibilityContext.jsx";
import { useVoice } from "../hooks/useVoice.js";

function Toggle({ on, onClick, icon, title, desc }) {
  return (
    <div className="list-row">
      <div className="lead">
        <div className="dot">{icon}</div>
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div className="muted" style={{ fontSize: ".85rem" }}>{desc}</div>
        </div>
      </div>
      <button className={"btn " + (on ? "success" : "secondary")} onClick={onClick}>
        {on ? "On" : "Off"}
      </button>
    </div>
  );
}

export default function Accessibility() {
  const { settings, toggle, speak, stopSpeaking } = useAccessibility();
  const [heard, setHeard] = useState("");
  const voice = useVoice({ onResult: setHeard });

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>♿ Accessibility</h1>
        <p>Adapt Sanadi AI to your needs — powered by the Accessibility agent.</p>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-title">Display</h3>
          <p className="card-sub">Make the interface easier to read</p>
          <Toggle on={settings.largeText} onClick={() => toggle("largeText")} icon="🔠" title="Large text" desc="Increase text size across the app" />
          <Toggle on={settings.highContrast} onClick={() => toggle("highContrast")} icon="◐" title="High contrast" desc="Dark, high-contrast color scheme" />
        </div>

        <div className="card">
          <h3 className="card-title">Voice</h3>
          <p className="card-sub">Hands-free interaction</p>
          <Toggle on={settings.voiceEnabled} onClick={() => toggle("voiceEnabled")} icon="🔊" title="Read replies aloud" desc="Text-to-speech for AI responses" />

          <div className="mt-lg">
            <button className="btn secondary" onClick={() => speak("Hello! This is Sanadi AI reading text aloud for you.")}>
              ▶ Test text-to-speech
            </button>{" "}
            <button className="btn ghost" onClick={stopSpeaking}>Stop</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">👁️ Hands-free Face Control</h3>
        <p className="card-sub">
          For limited hand/arm mobility — steer a pointer with your <b>head</b> and
          <b> blink</b> to tap. Runs entirely in your browser; the camera video never
          leaves your device.
        </p>
        <Toggle
          on={settings.faceControl}
          onClick={() => toggle("faceControl")}
          icon="👁️"
          title="Enable face control"
          desc="Head-move the pointer, blink to click (asks for camera access)"
        />
        <ul className="feature-list mt">
          <li>Move your head to move the on-screen pointer</li>
          <li>Blink deliberately to tap the item under the pointer</li>
          <li>Adjust head sensitivity & blink ease from the control panel</li>
          <li>Works on any page — a floating panel appears when active</li>
        </ul>
        <p className="muted" style={{ fontSize: ".82rem" }}>
          Best in Chrome, Edge or Safari on a device with a webcam. Good lighting
          and a centered face improve tracking.
        </p>
      </div>

      <div className="card">
        <h3 className="card-title">🎤 Speech-to-text</h3>
        <p className="card-sub">
          {voice.supported ? "Tap the mic and speak — your words appear below." : "Your browser doesn't support speech recognition."}
        </p>
        {voice.supported && (
          <div className="row wrap">
            <button
              className={"btn lg " + (voice.listening ? "danger" : "")}
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
            >
              {voice.listening ? "⏹ Stop listening" : "🎤 Start listening"}
            </button>
            <div className="card" style={{ flex: 1, minWidth: 240, background: "var(--surface-2)" }}>
              {heard || voice.transcript || <span className="muted">Your speech will appear here…</span>}
            </div>
          </div>
        )}
      </div>

      <div className="card center" style={{ background: "var(--mint)" }}>
        💡 Tip: These settings are saved on this device and apply everywhere in Sanadi AI.
      </div>
    </div>
  );
}
