import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Navigation is role-aware: each user only sees the sections meant for them.
const NAV = {
  patient: [
    {
      label: "Main",
      items: [
        { to: "/", icon: "🏠", label: "Home", end: true },
        { to: "/chat", icon: "💬", label: "AI Assistant" },
        { to: "/dashboard", icon: "📋", label: "My Health" },
        { to: "/appointments", icon: "📅", label: "Appointments" },
        { to: "/medications", icon: "💊", label: "Medications" },
        { to: "/analytics", icon: "📊", label: "Analytics" },
      ],
    },
    {
      label: "Care Modules",
      items: [
        { to: "/care", icon: "🏥", label: "Specialized Care" },
        { to: "/care/rehabilitation", icon: "🥽", label: "VR Rehab" },
      ],
    },
  ],
  caregiver: [
    {
      label: "Main",
      items: [
        { to: "/", icon: "🏠", label: "Home", end: true },
        { to: "/caregiver", icon: "👨‍👩‍👧", label: "Caregiver Portal" },
        { to: "/care", icon: "🏥", label: "Care Guides" },
      ],
    },
  ],
  provider: [
    {
      label: "Main",
      items: [
        { to: "/", icon: "🏠", label: "Home", end: true },
        { to: "/provider", icon: "👨‍⚕️", label: "Provider Portal" },
      ],
    },
  ],
};

function Item({ to, icon, label, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
    >
      <span className="ico">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open, onNavigate }) {
  const { user } = useAuth();
  const groups = NAV[user?.role] || NAV.patient;

  return (
    <aside className={"sidebar" + (open ? " open" : "")}>
      <div className="brand">
        <span className="logo">🏥</span>
        <span>Sanadi&nbsp;AI</span>
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          <div className="nav-group-label">{group.label}</div>
          {group.items.map((i) => (
            <Item key={i.to} {...i} onNavigate={onNavigate} />
          ))}
        </div>
      ))}

      <div className="nav-group-label">Settings</div>
      <Item to="/accessibility" icon="♿" label="Accessibility" onNavigate={onNavigate} />
    </aside>
  );
}
