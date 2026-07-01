import { NavLink } from "react-router-dom";

const MAIN = [
  { to: "/", icon: "🏠", label: "Home", end: true },
  { to: "/chat", icon: "💬", label: "AI Assistant" },
  { to: "/dashboard", icon: "📋", label: "My Health" },
  { to: "/appointments", icon: "📅", label: "Appointments" },
  { to: "/medications", icon: "💊", label: "Medications" },
  { to: "/analytics", icon: "📊", label: "Analytics" },
];

const CARE = [
  { to: "/care", icon: "🏥", label: "Specialized Care" },
  { to: "/care/rehabilitation", icon: "🥽", label: "VR Rehab" },
];

const ROLES = [
  { to: "/caregiver", icon: "👨‍👩‍👧", label: "Caregiver Portal" },
  { to: "/provider", icon: "👨‍⚕️", label: "Provider Portal" },
];

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
  return (
    <aside className={"sidebar" + (open ? " open" : "")}>
      <div className="brand">
        <span className="logo">🏥</span>
        <span>Sanadi&nbsp;AI</span>
      </div>

      <div className="nav-group-label">Main</div>
      {MAIN.map((i) => (
        <Item key={i.to} {...i} onNavigate={onNavigate} />
      ))}

      <div className="nav-group-label">Care Modules</div>
      {CARE.map((i) => (
        <Item key={i.to} {...i} onNavigate={onNavigate} />
      ))}

      <div className="nav-group-label">Portals</div>
      {ROLES.map((i) => (
        <Item key={i.to} {...i} onNavigate={onNavigate} />
      ))}

      <div className="nav-group-label">Settings</div>
      <Item to="/accessibility" icon="♿" label="Accessibility" onNavigate={onNavigate} />
    </aside>
  );
}
