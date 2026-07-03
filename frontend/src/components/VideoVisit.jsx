import { useEffect } from "react";
import { motion } from "framer-motion";

// In-app telehealth room. Uses Jitsi Meet (free, open source) — the room
// name is derived from the appointment id, so the doctor and the patient
// pressing "Join" on the same appointment land in the same call.
export default function VideoVisit({ appointment, onClose }) {
  const room = `SanadiAI-visit-${appointment.id}`;
  const url = `https://meet.jit.si/${room}`;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="video-overlay" role="dialog" aria-modal="true" aria-label="Video visit">
      <motion.div
        className="video-panel"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="video-head">
          <div>
            <div style={{ fontWeight: 800 }}>📹 Video visit — {appointment.department}</div>
            <div className="muted" style={{ fontSize: ".78rem" }}>
              Room {room} · both sides join from their own portal
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <a className="btn ghost sm" href={url} target="_blank" rel="noreferrer">
              ↗ Open in new tab
            </a>
            <button className="btn danger sm" onClick={onClose}>✕ Leave</button>
          </div>
        </div>
        <iframe
          src={url}
          title="Video visit room"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
        />
        <div className="video-foot muted">
          Powered by Jitsi Meet (open source) — video streams peer-to-peer, not through Sanadi servers.
        </div>
      </motion.div>
    </div>
  );
}
