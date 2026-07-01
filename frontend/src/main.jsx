import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import FaceControl from "./components/FaceControl.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AccessibilityProvider } from "./context/AccessibilityContext.jsx";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/pages.css";
import "./styles/facecontrol.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <AccessibilityProvider>
          <App />
          <FaceControl />
        </AccessibilityProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
