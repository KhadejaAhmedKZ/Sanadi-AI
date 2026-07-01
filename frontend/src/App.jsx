import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import CaregiverDashboard from "./pages/CaregiverDashboard.jsx";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import Appointments from "./pages/Appointments.jsx";
import Medications from "./pages/Medications.jsx";
import Analytics from "./pages/Analytics.jsx";
import SpecializedCare from "./pages/SpecializedCare.jsx";
import Rehab from "./pages/Rehab.jsx";
import CareModule from "./pages/CareModule.jsx";
import Accessibility from "./pages/Accessibility.jsx";

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Restrict a route to a specific role; others are sent to their own home.
function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (user?.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Home />} />
        {/* Patient-only sections */}
        <Route path="/chat" element={<RequireRole role="patient"><Chat /></RequireRole>} />
        <Route path="/dashboard" element={<RequireRole role="patient"><PatientDashboard /></RequireRole>} />
        <Route path="/appointments" element={<RequireRole role="patient"><Appointments /></RequireRole>} />
        <Route path="/medications" element={<RequireRole role="patient"><Medications /></RequireRole>} />
        <Route path="/analytics" element={<RequireRole role="patient"><Analytics /></RequireRole>} />
        <Route path="/care/rehabilitation" element={<RequireRole role="patient"><Rehab /></RequireRole>} />
        {/* Role portals */}
        <Route path="/caregiver" element={<RequireRole role="caregiver"><CaregiverDashboard /></RequireRole>} />
        <Route path="/provider" element={<RequireRole role="provider"><DoctorDashboard /></RequireRole>} />
        {/* Open to everyone */}
        <Route path="/care" element={<SpecializedCare />} />
        <Route path="/care/:moduleId" element={<CareModule />} />
        <Route path="/accessibility" element={<Accessibility />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
