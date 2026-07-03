import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, Sparkles, Sun, Moon, Globe, Bell, Accessibility, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useNotifications } from "../hooks/useNotifications.js";
import { flatNav } from "../nav.js";
import AccessibilityBar from "./AccessibilityBar.jsx";

const TITLES = {
  "/": "Welcome",
  "/chat": "AI Assistant",
  "/dashboard": "My Health",
  "/appointments": "Appointments",
  "/medications": "Medications",
  "/labs": "Lab Results",
  "/analytics": "Analytics",
  "/care": "Specialized Care",
  "/care/rehabilitation": "VR Rehabilitation",
  "/caregiver": "Caregiver Portal",
  "/provider": "Provider Portal",
  "/accessibility": "Accessibility",
};

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

export default function TopBar({ onMenu }) {
  const { user, logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const notifications = useNotifications(user);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  useOutsideClose(searchRef, () => setSearchOpen(false));
  useOutsideClose(notifRef, () => setNotifOpen(false));
  useOutsideClose(profileRef, () => setProfileOpen(false));

  const title = TITLES[pathname] || "Sanadi AI";
  const initials = (user?.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const results = query.trim()
    ? flatNav(user?.role).filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  function goTo(to) {
    navigate(to);
    setQuery("");
    setSearchOpen(false);
  }

  return (
    <header className="topbar">
      <div className="row">
        <button className="menu-btn" onClick={onMenu} aria-label="Toggle menu"><Menu size={20} aria-hidden="true" /></button>
        <span className="page-title">{title}</span>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <div className="topbar-search" ref={searchRef}>
          <span className="search-ico"><Search size={15} aria-hidden="true" /></span>
          <input
            placeholder="Search pages & features…"
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
          />
          <AnimatePresence>
            {searchOpen && results.length > 0 && (
              <motion.div
                className="search-results"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {results.map((r) => (
                  <button key={r.to} onClick={() => goTo(r.to)}>
                    <span style={{ display: "inline-flex" }}><r.icon size={15} aria-hidden="true" /></span> {r.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="btn gradient sm" onClick={() => navigate("/chat")} title="Ask Sanadi AI">
          <Sparkles size={15} aria-hidden="true" /> Ask AI
        </button>

        <AccessibilityBar />

        <button className="icon-btn" onClick={toggleTheme} title="Toggle dark mode" aria-label="Toggle dark mode">
          {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>

        <div className="lang-select" title="More languages coming soon">
          <Globe size={14} aria-hidden="true" /> EN
        </div>

        <div style={{ position: "relative" }} ref={notifRef}>
          <button className="icon-btn" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications">
            <Bell size={18} aria-hidden="true" />
            {notifications.length > 0 && <span className="dot-badge">{notifications.length}</span>}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                className="dropdown-panel"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
              >
                <div className="dropdown-title">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="muted" style={{ padding: "16px 4px", fontSize: ".85rem" }}>You're all caught up 🎉</div>
                ) : (
                  notifications.map((n) => (
                    <div className="dropdown-item" key={n.id}>
                      <span style={{ fontSize: "1.1rem" }}>{n.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: ".85rem" }}>{n.title}</div>
                        <div className="muted" style={{ fontSize: ".78rem" }}>{n.body}</div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ position: "relative" }} ref={profileRef}>
          <button className="user-chip" onClick={() => setProfileOpen((o) => !o)}>
            <div className="avatar">{initials}</div>
            <div style={{ lineHeight: 1.1, textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{user?.name}</div>
              <div className="muted" style={{ fontSize: ".75rem", textTransform: "capitalize" }}>{user?.role}</div>
            </div>
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                className="dropdown-panel"
                style={{ right: 0, minWidth: 190 }}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
              >
                <button className="dropdown-link" onClick={() => { setProfileOpen(false); navigate("/accessibility"); }}>
                  <Accessibility size={16} aria-hidden="true" /> Accessibility
                </button>
                <button className="dropdown-link" onClick={() => { setProfileOpen(false); toggleTheme(); }}>
                  {isDark ? <><Sun size={16} aria-hidden="true" /> Light mode</> : <><Moon size={16} aria-hidden="true" /> Dark mode</>}
                </button>
                <button
                  className="dropdown-link danger"
                  onClick={() => { logout(); navigate("/login"); }}
                >
                  <LogOut size={16} aria-hidden="true" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
