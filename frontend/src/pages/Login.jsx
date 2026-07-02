import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeartPulse, Mail, Lock, Eye, EyeOff, ChevronRight,
  User, Users, Stethoscope,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorNote } from "../components/ui.jsx";

const AGENTS = ["🧠 Orchestrator", "👨‍⚕️ Clinical", "📅 Operations", "💬 Engagement", "♿ Accessibility", "📊 Analytics", "🛡️ Safety", "🥽 Rehab / VR"];

const DEMO_ACCOUNTS = [
  { role: "Patient", email: "sara@example.com", icon: User, bg: "var(--gradient-primary)" },
  { role: "Caregiver", email: "care@example.com", icon: Users, bg: "var(--gradient-secondary)" },
  { role: "Provider", email: "doctor@example.com", icon: Stethoscope, bg: "var(--gradient-warm)" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // false | true | email-of-demo

  async function doLogin(mail, pw, marker = true) {
    setError("");
    setLoading(marker);
    try {
      await login(mail, pw);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    doLogin(email, password);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="blob-field">
          <div className="blob" style={{ width: 340, height: 340, background: "#06b6d4", top: -60, left: -80 }} />
          <div className="blob" style={{ width: 300, height: 300, background: "#14b8a6", bottom: -60, right: -60, animationDelay: "3s" }} />
          <div className="blob" style={{ width: 220, height: 220, background: "#2563eb", top: "40%", left: "50%", animationDelay: "6s" }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <div className="auth-brand">
            <div className="logo-box"><HeartPulse size={28} strokeWidth={2.3} aria-hidden="true" /></div>
            <div>
              <div className="name">Sanadi AI</div>
              <div className="tag">سندي — your support</div>
            </div>
          </div>
          <h1>One care team.<br />Every role. Always on.</h1>
          <p>
            A coordinated network of AI specialists for clinical guidance, appointments,
            medication, rehabilitation and safety — for patients, families and providers.
          </p>

          <motion.div
            className="hero-glass-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <div className="bubble user">
              <span className="who">Sara</span>
              I have knee pain, can you book me a checkup?
            </div>
            <div className="bubble">
              <span className="who">Sanadi · Clinical + Operations</span>
              Booked for Monday 10am 📅 — and I've logged your knee pain so
              Dr. Hassan sees the trend before your visit.
            </div>
          </motion.div>

          <div className="auth-trust">
            <div><strong>8</strong><span>AI specialists</span></div>
            <div><strong>3</strong><span>connected roles</span></div>
            <div><strong>WCAG</strong><span>accessible by design</span></div>
          </div>

          <div className="agents">
            {AGENTS.map((a, i) => (
              <motion.span
                key={a}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
              >
                {a}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="auth-card">
        <motion.div
          className="inner"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2>Welcome back</h2>
          <p className="muted mb">Sign in to your health companion.</p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Email</span>
              <div className="input-icon-field">
                <span className="lead-ico"><Mail size={16} aria-hidden="true" /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            <label className="field">
              <span>Password</span>
              <div className="pw-field input-icon-field">
                <span className="lead-ico"><Lock size={16} aria-hidden="true" /></span>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"}>
                  {showPw ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </label>
            <ErrorNote message={error} />
            <motion.button
              className="btn block lg gradient mt"
              disabled={!!loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading === true ? "Signing in…" : "Sign In"}
            </motion.button>
          </form>

          <div className="auth-divider"><span>or try a demo account</span></div>
          <div className="demo-chips">
            {DEMO_ACCOUNTS.map((d) => (
              <button
                key={d.email}
                type="button"
                className="demo-chip"
                disabled={!!loading}
                onClick={() => doLogin(d.email, "demo1234", d.email)}
              >
                <span className="avatar-sm" style={{ background: d.bg }}>
                  <d.icon size={17} aria-hidden="true" />
                </span>
                <span>
                  <span className="role-name" style={{ display: "block" }}>
                    {loading === d.email ? "Signing in…" : `Continue as ${d.role}`}
                  </span>
                  <span className="role-mail">{d.email}</span>
                </span>
                <span className="go"><ChevronRight size={17} aria-hidden="true" /></span>
              </button>
            ))}
          </div>

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
