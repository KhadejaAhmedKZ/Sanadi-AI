import { useEffect, useRef, useState } from "react";
import { useAccessibility } from "../context/AccessibilityContext.jsx";

// Classic 4-7-8 breathing pattern.
const PHASES = [
  { key: "inhale", label: "Breathe in", seconds: 4 },
  { key: "hold", label: "Hold", seconds: 7 },
  { key: "exhale", label: "Breathe out", seconds: 8 },
];
const TOTAL_CYCLES = 4;

export default function BreathingExercise({ onClose }) {
  const { settings, speak, stopSpeaking } = useAccessibility();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].seconds);
  const [cycle, setCycle] = useState(1);
  const [done, setDone] = useState(false);
  const speakEnabled = settings.voiceEnabled || settings.screenReader;

  const phase = PHASES[phaseIdx];

  // Announce each phase change (helps blind/low-vision users follow along).
  useEffect(() => {
    if (done || !speakEnabled) return;
    speak(phase.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIdx, cycle, done]);

  // Tick the countdown once per second (fresh interval per phase).
  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [phaseIdx, cycle, done]);

  // When the countdown hits zero, advance to the next phase/cycle.
  useEffect(() => {
    if (done || secondsLeft > 0) return;
    const nextIdx = (phaseIdx + 1) % PHASES.length;
    if (nextIdx === 0) {
      if (cycle >= TOTAL_CYCLES) {
        setDone(true);
        if (speakEnabled) speak("Breathing exercise complete. Well done.");
        return;
      }
      setCycle((c) => c + 1);
    }
    setPhaseIdx(nextIdx);
    setSecondsLeft(PHASES[nextIdx].seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, done]);

  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  if (done) {
    return (
      <div className="breathing-box">
        <div className="breathing-circle" style={{ transform: "scale(0.65)" }}>🌿</div>
        <div className="breathing-label">Well done!</div>
        <div style={{ opacity: 0.85, fontSize: ".85rem" }}>Completed {TOTAL_CYCLES} calming cycles.</div>
        <button className="btn secondary sm mt" onClick={onClose}>Close</button>
      </div>
    );
  }

  const displaySeconds = Math.max(1, secondsLeft);
  const frac = (phase.seconds - displaySeconds) / phase.seconds;
  const scale =
    phase.key === "inhale" ? 0.55 + frac * 0.45 : phase.key === "exhale" ? 1 - frac * 0.45 : 1;

  return (
    <div className="breathing-box">
      <div className="breathing-circle" style={{ transform: `scale(${scale})` }}>
        {displaySeconds}
      </div>
      <div className="breathing-label">{phase.label}</div>
      <div style={{ opacity: 0.85, fontSize: ".85rem" }}>Cycle {cycle} of {TOTAL_CYCLES}</div>
      <button className="btn ghost sm mt" onClick={onClose}>Stop</button>
    </div>
  );
}
