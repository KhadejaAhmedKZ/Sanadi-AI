import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Loader, ErrorNote } from "../components/ui.jsx";

export default function SpecializedCare() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.careModules().then(setModules).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading care modules…" />;
  if (error) return <ErrorNote message={error} />;

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>Specialized Care</h1>
        <p>Focused modules tailored to specific conditions and life stages.</p>
      </div>

      <div className="grid cols-3">
        {modules.map((m) => (
          <div
            key={m.id}
            className="care-card"
            style={{ background: `linear-gradient(150deg, ${m.color}, ${m.color}cc)` }}
            onClick={() => navigate(m.route)}
            role="button"
          >
            <div>
              <div className="care-icon">{m.icon}</div>
              <h3>{m.name}</h3>
              <p>{m.tagline}</p>
            </div>
            <button className="btn care-go sm">Open module →</button>
          </div>
        ))}
      </div>
    </div>
  );
}
