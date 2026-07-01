import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AccessibilityBar from "./AccessibilityBar.jsx";

const TITLES = {
  "/": "Welcome",
  "/chat": "AI Assistant",
  "/dashboard": "My Health",
  "/appointments": "Appointments",
  "/medications": "Medications",
  "/analytics": "Analytics",
  "/care": "Specialized Care",
  "/care/rehabilitation": "VR Rehabilitation",
  "/caregiver": "Caregiver Portal",
  "/provider": "Provider Portal",
  "/accessibility": "Accessibility",
};

export default function TopBar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = TITLES[pathname] || "Sanadi AI";
  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="topbar">
      <div className="row">
        <button className="menu-btn" onClick={onMenu} aria-label="Toggle menu">☰</button>
        <span className="page-title">{title}</span>
      </div>
      <div className="row" style={{ gap: 16 }}>
        <AccessibilityBar />
        <div className="user-chip">
          <div className="avatar" title={user?.name}>{initials}</div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{user?.name}</div>
            <div className="muted" style={{ fontSize: ".75rem", textTransform: "capitalize" }}>
              {user?.role}
            </div>
          </div>
          <button
            className="btn ghost sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
