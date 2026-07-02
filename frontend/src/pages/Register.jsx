import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorNote } from "../components/ui.jsx";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        ...form,
        conditions: form.conditions || null,
        accessibility_needs: form.accessibility_needs || null,
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
          <h1>🏥 Join Sanadi AI</h1>
          <p>
            Create your account to access a connected healthcare ecosystem for patients,
            caregivers and providers — with AI support at every step.
          </p>
        </motion.div>
      </div>
      <div className="auth-card">
        <motion.div className="inner" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h2>Create account</h2>
          <p className="muted mb">It only takes a minute.</p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Full name</span>
              <input value={form.name} onChange={set("name")} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={set("email")} required />
            </label>
            <label className="field">
              <span>Password</span>
              <div className="pw-field">
                <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} required minLength={6} />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password visibility">
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </label>
            <label className="field">
              <span>I am a…</span>
              <select value={form.role} onChange={set("role")}>
                <option value="patient">Patient</option>
                <option value="caregiver">Caregiver</option>
                <option value="provider">Healthcare Provider</option>
              </select>
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
