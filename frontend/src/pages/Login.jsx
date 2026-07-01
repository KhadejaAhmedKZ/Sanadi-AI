import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ErrorNote } from "../components/ui.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("sara@example.com");
  const [password, setPassword] = useState("demo1234");
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
        <h1>🏥 Sanadi AI</h1>
        <p>
          Your AI-powered healthcare team — always by your side. A coordinated network of
          specialist agents for clinical guidance, appointments, medication, rehabilitation and safety.
        </p>
        <div className="agents">
          <span>🧠 Orchestrator</span>
          <span>👨‍⚕️ Clinical</span>
          <span>📅 Operations</span>
          <span>💬 Engagement</span>
          <span>♿ Accessibility</span>
          <span>📊 Analytics</span>
          <span>🛡️ Safety</span>
          <span>🥽 Rehab / VR</span>
        </div>
      </div>

      <div className="auth-card">
        <div className="inner">
          <h2>Welcome back</h2>
          <p className="muted mb">Sign in to your health companion.</p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <ErrorNote message={error} />
            <button className="btn block lg mt" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
          <p className="muted" style={{ fontSize: ".8rem", marginTop: 20 }}>
            Demo: sara@example.com / demo1234
          </p>
        </div>
      </div>
    </div>
  );
}
