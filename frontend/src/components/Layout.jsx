import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sanadi_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const location = useLocation();

  useEffect(() => {
    try { localStorage.setItem("sanadi_sidebar_collapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  return (
    <div className={"app-shell" + (collapsed ? " sidebar-collapsed" : "")}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <Sidebar
        open={open}
        onNavigate={() => setOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className="main">
        <TopBar onMenu={() => setOpen((o) => !o)} />
        <div className="content" id="main-content" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
