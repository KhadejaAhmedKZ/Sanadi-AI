import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
        <h1>🏥 Join Sanadi AI</h1>
        <p>
          Create your account to access a connected healthcare ecosystem for patients,
          caregivers and providers — with AI support at every step.
        </p>
      </div>
      <div className="auth-card">
        <div className="inner">
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
              <input type="password" value={form.password} onChange={set("password")} required minLength={6} />
            </label>
            <label className="field">
              <span>I am a…</span>
              <select value={form.role} onChange={set("role")}>
                <option value="patient">Patient</option>
                <option value="caregiver">Caregiver</option>
                <option value="provider">Healthcare Provider</option>
              </select>
            </label>
            {form.role === "patient" && (
              <>
                <label className="field">
                  <span>Health conditions (optional)</span>
                  <input value={form.conditions} onChange={set("conditions")} placeholder="e.g. Diabetes, Hypertension" />
                </label>
                <label className="field">
                  <span>Accessibility needs (optional)</span>
                  <input value={form.accessibility_needs} onChange={set("accessibility_needs")} placeholder="e.g. Larger text, simple explanations" />
                </label>
              </>
            )}
            <ErrorNote message={error} />
            <button className="btn block lg mt" disabled={loading}>
              {loading ? "Creating…" : "Create Account"}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
