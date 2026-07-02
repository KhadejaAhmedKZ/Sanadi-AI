import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import FaceControl from "./components/FaceControl.jsx";
import SpeechAnnouncer from "./components/SpeechAnnouncer.jsx";
import OfflineNotice from "./components/OfflineNotice.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AccessibilityProvider } from "./context/AccessibilityContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/pages.css";
import "./styles/facecontrol.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <HashRouter>
        <AuthProvider>
          <AccessibilityProvider>
            <ToastProvider>
              <OfflineNotice />
              <App />
              <FaceControl />
              <SpeechAnnouncer />
            </ToastProvider>
          </AccessibilityProvider>
        </AuthProvider>
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
);
