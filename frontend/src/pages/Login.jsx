import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import UAEPassLogo from "../components/UAEPassLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorNote } from "../components/ui.jsx";

const AGENTS = ["🧠 Orchestrator", "👨‍⚕️ Clinical", "📅 Operations", "💬 Engagement", "♿ Accessibility", "📊 Analytics", "🛡️ Safety", "🥽 Rehab / VR"];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("sara@example.com");
  const [password, setPassword] = useState("demo1234");
  const [showPw, setShowPw] = useState(false);
  const [uaeState, setUaeState] = useState("idle"); // idle | connecting | note
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function uaePass() {
    if (uaeState === "connecting") return;
    setUaeState("connecting");
    setTimeout(() => setUaeState("note"), 1600);
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
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </motion.button>
          </form>

          <div className="auth-divider"><span>or continue with</span></div>
          <div className="row" style={{ gap: 10 }}>
            <button
              type="button"
              className="btn-uaepass"
              style={{ flex: 1, minHeight: 48 }}
              onClick={uaePass}
              disabled={uaeState === "connecting"}
            >
              {uaeState === "connecting"
                ? <Loader2 size={17} className="spin" aria-hidden="true" />
                : <UAEPassLogo size={24} />}
              {uaeState === "connecting" ? "Connecting…" : "UAE PASS"}
            </button>
            <button type="button" className="btn secondary block" style={{ flex: 1 }} disabled title="Face ID — coming soon">
              <span>🆔</span> Face ID
            </button>
          </div>
          <AnimatePresence>
            {uaeState === "note" && (
              <motion.div
                className="uaepass-note"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <strong>UAE PASS is simulated in this demo</strong> — the production
                app would authenticate with your national digital identity here. Use a
                demo account below for now.
              </motion.div>
            )}
          </AnimatePresence>

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
          <div className="muted" style={{ fontSize: ".8rem", marginTop: 20, lineHeight: 1.7 }}>
            <strong>Demo accounts</strong> (password: demo1234)
            <div>👤 Patient — sara@example.com</div>
            <div>👨‍👩‍👧 Primary Carer — care@example.com</div>
            <div>👨‍⚕️ Provider — doctor@example.com</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
