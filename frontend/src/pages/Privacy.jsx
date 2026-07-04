import { motion } from "framer-motion";
import {
  Lock, KeyRound, ShieldCheck, UserCog, ClipboardCheck,
  FileLock2, Cloud, ScrollText, Camera, EyeOff,
} from "lucide-react";

const BADGES = [
  { icon: Lock, title: "End-to-end encryption", desc: "Medical data is encrypted in transit and at rest." },
  { icon: KeyRound, title: "Two-factor authentication", desc: "UAE PASS + email with a verification step (demo)." },
  { icon: ShieldCheck, title: "AI privacy protected", desc: "Vision monitoring runs on-device; frames are never uploaded." },
  { icon: UserCog, title: "Role-based access control", desc: "Patients, Primary Carers, and doctors each see only what they should." },
  { icon: ClipboardCheck, title: "Patient consent required", desc: "Monitoring and data sharing are opt-in, always reversible." },
  { icon: FileLock2, title: "Encrypted medical records", desc: "Labs, notes, and assessments are protected at the record level." },
  { icon: Cloud, title: "Secure cloud storage", desc: "Hosted with encrypted storage and access controls." },
  { icon: ScrollText, title: "Audit logs", desc: "Sensitive actions are traceable for accountability." },
];

const ACCESS = [
  { role: "Patient", color: "var(--gradient-primary)", can: "Everything about themselves — full history, assessments, AI conversations, monitoring." },
  { role: "Primary Carer", color: "var(--gradient-secondary)", can: "Only the scopes the patient granted (medications, appointments, symptoms, safety alerts). Never private AI chats or hidden records." },
  { role: "Doctor", color: "var(--gradient-warm)", can: "Clinical history: surgeries, pain history, body assessments, labs, clinical notes, AI summaries, treatment plans, emergency events." },
];

export default function Privacy() {
  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🔐 Security & Privacy</h1>
        <p>How Sanadi AI protects your health data — in plain language.</p>
      </div>

      <div className="card" style={{ background: "var(--secondary-100)", borderColor: "var(--secondary)" }}>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div className="stat-icon" style={{ background: "var(--surface)" }}><EyeOff size={20} /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3 className="card-title" style={{ marginBottom: 2 }}>Privacy-first by design</h3>
            <p className="muted" style={{ margin: 0, fontSize: ".88rem", lineHeight: 1.55 }}>
              Camera monitoring is <strong>off by default</strong> and only starts after you explicitly turn it on.
              The camera is never activated secretly, continuous video is never stored, frames are analyzed on
              your own device, and only emergency events are saved — with your permission. You control who
              receives alerts, and you can stop monitoring at any time.
            </p>
          </div>
        </div>
      </div>

      <div className="grid cols-2">
        {BADGES.map((b, i) => (
          <motion.div
            key={b.title}
            className="card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="row" style={{ gap: 12 }}>
              <div className="stat-icon" style={{ background: "var(--primary-100)" }}><b.icon size={18} /></div>
              <div>
                <div style={{ fontWeight: 800 }}>{b.title}</div>
                <div className="muted" style={{ fontSize: ".84rem", lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 style={{ marginBottom: 14 }}>Who can see what — Role-Based Access Control</h2>
        <div className="grid cols-3">
          {ACCESS.map((a) => (
            <div className="card" key={a.role}>
              <span className="badge" style={{ background: a.color, color: "#fff" }}>{a.role}</span>
              <p style={{ fontSize: ".88rem", lineHeight: 1.55, marginTop: 10 }}>{a.can}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title"><Camera size={16} style={{ verticalAlign: "-2px" }} /> Camera & monitoring consent</h3>
        <ul className="feature-list">
          <li>🔕 Monitoring is disabled until you enable it — no exceptions.</li>
          <li>📵 Video is analyzed live on your device and is never uploaded or continuously recorded.</li>
          <li>💾 Only emergency events (a fall, sustained inactivity) are saved — not footage.</li>
          <li>🛑 You can stop monitoring instantly, and revoke camera permission in your browser at any time.</li>
          <li>👥 You choose who gets alerted (your Primary Carer, and optionally your doctor).</li>
        </ul>
      </div>

      <p className="muted" style={{ fontSize: ".8rem" }}>
        Note: this is a hackathon prototype. Several protections above (2FA, audit logs, full encryption-at-rest)
        are represented at the product/UX level to show the intended production posture — see the README for
        exactly what is implemented versus planned.
      </p>
    </div>
  );
}
