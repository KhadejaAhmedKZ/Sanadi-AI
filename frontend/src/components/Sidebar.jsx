import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HeartPulse, ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../hooks/useNotifications.js";
import { NAV, AccessibilityIcon } from "../nav.js";

function Item({ to, icon: Icon, label, end, onNavigate, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
      title={collapsed ? label : undefined}
    >
      <span className="ico"><Icon size={19} strokeWidth={2.1} aria-hidden="true" /></span>
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ open, onNavigate, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const groups = NAV[user?.role] || NAV.patient;
  const notifications = useNotifications(user);

  const initials = (user?.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className={"sidebar" + (open ? " open" : "") + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-top">
        <div className="brand">
          <span className="logo"><HeartPulse size={22} strokeWidth={2.4} aria-hidden="true" /></span>
          {!collapsed && <span>Sanadi&nbsp;AI</span>}
        </div>
        <button className="collapse-btn" onClick={onToggleCollapse} aria-label="Toggle sidebar">
          {collapsed ? <ChevronsRight size={17} aria-hidden="true" /> : <ChevronsLeft size={17} aria-hidden="true" />}
        </button>
      </div>

      <nav className="sidebar-scroll">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && <div className="nav-group-label">{group.label}</div>}
            {group.items.map((i) => (
              <Item key={i.to} {...i} onNavigate={onNavigate} collapsed={collapsed} />
            ))}
          </div>
        ))}

        {!collapsed && <div className="nav-group-label">Settings</div>}
        <div style={{ position: "relative" }}>
          <Item to="/accessibility" icon={AccessibilityIcon} label="Accessibility" onNavigate={onNavigate} collapsed={collapsed} />
          {notifications.length > 0 && (
            <motion.span
              className="sidebar-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={collapsed ? { top: 6, right: 6 } : undefined}
            >
              {notifications.length}
            </motion.span>
          )}
        </div>
      </nav>

      <button className="sidebar-profile" onClick={() => navigate("/accessibility")} title="Account settings">
        <div className="avatar sm">{initials}</div>
        {!collapsed && (
          <div style={{ textAlign: "left", overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: ".85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name}
            </div>
            <div className="muted" style={{ fontSize: ".72rem", textTransform: "capitalize" }}>{user?.role}</div>
          </div>
        )}
      </button>
      {!collapsed && (
        <button
          className="btn ghost sm block"
          style={{ margin: "6px 12px 14px" }}
          onClick={() => { logout(); navigate("/login"); }}
        >
          <LogOut size={16} aria-hidden="true" /> Logout
        </button>
      )}
    </aside>
  );
}
