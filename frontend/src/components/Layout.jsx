import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      <div className="main">
        <TopBar onMenu={() => setOpen((o) => !o)} />
        <div className="content" key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
