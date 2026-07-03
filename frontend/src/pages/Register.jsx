import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartPulse, Mail, Lock, Eye, EyeOff, UserRound, Loader2,
  User, Users, Stethoscope,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorNote } from "../components/ui.jsx";

const ROLES = [
  { id: "patient", label: "Patient", icon: User },
  { id: "caregiver", label: "Caregiver", icon: Users },
  { id: "provider", label: "Provider", icon: Stethoscope },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
    conditions: "",
    accessibility_needs: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [uaeState, setUaeState] = useState("idle"); // idle | connecting | note
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function uaePass() {
    if (uaeState === "connecting") return;
    setUaeState("connecting");
    setTimeout(() => setUaeState("note"), 1600);
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const isPatient = form.role === "patient";
      await register({
        ...form,
        // Patient-only fields: drop any values typed before switching role.
        conditions: isPatient ? form.conditions || null : null,
        accessibility_needs: isPatient ? form.accessibility_needs || null : null,
      });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="blob-field">
          <div className="blob" style={{ width: 320, height: 320, background: "#14b8a6", top: -60, right: -60 }} />
          <div className="blob" style={{ width: 260, height: 260, background: "#2563eb", bottom: -40, left: -60, animationDelay: "4s" }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <div className="auth-brand">
            <div className="logo-box"><HeartPulse size={28} strokeWidth={2.3} aria-hidden="true" /></div>
            <div>
              <div className="name">Sanadi AI</div>
              <div className="tag">سندي — your support</div>
            </div>
          </div>
          <h1>Join the care circle</h1>
          <p>
            One account connects you to an AI care team built for your role — a health
            companion for patients, a support guide for families, and a clinical copilot
            for providers.
          </p>
          <div className="auth-trust">
            <div><strong>1 min</strong><span>to get started</span></div>
            <div><strong>Free</strong><span>demo access</span></div>
            <div><strong>Private</strong><span>you control sharing</span></div>
          </div>
        </motion.div>
      </div>
      <div className="auth-card">
        <motion.div className="inner" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h2>Create account</h2>
          <p className="muted mb">It only takes a minute.</p>

          <button type="button" className="btn-uaepass" onClick={uaePass} disabled={uaeState === "connecting"} style={{ marginBottom: 6 }}>
            {uaeState === "connecting"
              ? <Loader2 size={17} className="spin" aria-hidden="true" />
              : <span style={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden="true">🇦🇪</span>}
            {uaeState === "connecting" ? "Connecting to UAE PASS…" : "Continue with UAE PASS"}
          </button>
          <AnimatePresence>
            {uaeState === "note" && (
              <motion.div
                className="uaepass-note"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                🇦🇪 <strong>UAE PASS is simulated in this demo</strong> — in production
                your profile would come from your national digital identity. For now,
                register below.
              </motion.div>
            )}
          </AnimatePresence>

          <div className="auth-divider"><span>or register manually</span></div>

          <form onSubmit={submit}>
            <label className="field" style={{ marginBottom: 14 }}>
              <span>I am a…</span>
            </label>
            <div className="role-segments" style={{ marginTop: -8, marginBottom: 16 }} role="radiogroup" aria-label="Account type">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={form.role === r.id}
                  className={"role-segment" + (form.role === r.id ? " active" : "")}
                  onClick={() => setForm({ ...form, role: r.id })}
                >
                  <r.icon size={19} aria-hidden="true" />
                  {r.label}
                </button>
              ))}
            </div>

            <label className="field">
              <span>Full name</span>
              <div className="input-icon-field">
                <span className="lead-ico"><UserRound size={16} aria-hidden="true" /></span>
                <input value={form.name} onChange={set("name")} placeholder="Your name" autoComplete="name" required />
              </div>
            </label>
            <label className="field">
              <span>Email</span>
              <div className="input-icon-field">
                <span className="lead-ico"><Mail size={16} aria-hidden="true" /></span>
                <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" required />
              </div>
            </label>
            <label className="field">
              <span>Password</span>
              <div className="pw-field input-icon-field">
                <span className="lead-ico"><Lock size={16} aria-hidden="true" /></span>
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}>
                  {showPw ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </label>

            <AnimatePresence>
              {form.role === "patient" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <label className="field">
                    <span>Health conditions (optional)</span>
                    <input value={form.conditions} onChange={set("conditions")} placeholder="e.g. Diabetes, Hypertension" />
                  </label>
                  <label className="field">
                    <span>Accessibility needs (optional)</span>
                    <input value={form.accessibility_needs} onChange={set("accessibility_needs")} placeholder="e.g. Larger text, simple explanations" />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
            <ErrorNote message={error} />
            <motion.button
              className="btn block lg gradient mt"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? "Creating…" : "Create Account"}
            </motion.button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
