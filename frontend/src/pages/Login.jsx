import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorNote } from "../components/ui.jsx";

const AGENTS = ["🧠 Orchestrator", "👨‍⚕️ Clinical", "📅 Operations", "💬 Engagement", "♿ Accessibility", "📊 Analytics", "🛡️ Safety", "🥽 Rehab / VR"];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("sara@example.com");
  const [password, setPassword] = useState("demo1234");
  const [showPw, setShowPw] = useState(false);
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
          <h1>🏥 Sanadi AI</h1>
          <p>
            Your AI-powered healthcare team — always by your side. A coordinated network of
            specialist agents for clinical guidance, appointments, medication, rehabilitation and safety.
          </p>
          <div className="agents">
            {AGENTS.map((a, i) => (
              <motion.span
                key={a}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <div className="pw-field">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password visibility">
                  {showPw ? "🙈" : "👁️"}
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
            <button type="button" className="btn secondary block" disabled title="Google sign-in — coming soon">
              <span>🔵</span> Google
            </button>
            <button type="button" className="btn secondary block" disabled title="Face ID — coming soon">
              <span>🆔</span> Face ID
            </button>
          </div>

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
          <div className="muted" style={{ fontSize: ".8rem", marginTop: 20, lineHeight: 1.7 }}>
            <strong>Demo accounts</strong> (password: demo1234)
            <div>👤 Patient — sara@example.com</div>
            <div>👨‍👩‍👧 Caregiver — care@example.com</div>
            <div>👨‍⚕️ Provider — doctor@example.com</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
