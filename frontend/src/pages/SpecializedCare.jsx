import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { Loader, ErrorNote } from "../components/ui.jsx";

export default function SpecializedCare() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPatient = user?.role === "patient";

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
        {modules.map((m) => {
          // VR Rehabilitation's interactive session is patient-only.
          const locked = m.id === "rehabilitation" && !isPatient;
          return (
            <div
              key={m.id}
              className={"care-card" + (locked ? " locked" : "")}
              style={{ background: `linear-gradient(150deg, ${m.color}, ${m.color}cc)` }}
              onClick={() => { if (!locked) navigate(m.route); }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !locked) { e.preventDefault(); navigate(m.route); }
              }}
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-disabled={locked}
              aria-label={locked ? `${m.name} module — patient accounts only` : `Open ${m.name} module`}
            >
              <div>
                <div className="care-icon">{m.icon}</div>
                <h3>{m.name}</h3>
                <p>{m.tagline}</p>
              </div>
              <span className="btn care-go sm" aria-hidden="true">
                {locked ? "🔒 Patients only" : "Open module →"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
