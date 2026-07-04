import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import Appointments from "./pages/Appointments.jsx";
import Medications from "./pages/Medications.jsx";
import Labs from "./pages/Labs.jsx";
import Meals from "./pages/Meals.jsx";
import FindCare from "./pages/FindCare.jsx";
import BodyMap from "./pages/BodyMap.jsx";
import Monitoring from "./pages/Monitoring.jsx";
import Privacy from "./pages/Privacy.jsx";
import Learning from "./pages/Learning.jsx";
import Accessibility from "./pages/Accessibility.jsx";
import NotFound from "./pages/NotFound.jsx";
import { SkeletonStatGrid, SkeletonList } from "./components/Skeleton.jsx";

// Lazy-load the heavier / less-frequently-visited pages (charts, VR
// visualization, staff dashboards) so the initial bundle stays lean.
const CaregiverDashboard = lazy(() => import("./pages/CaregiverDashboard.jsx"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const SpecializedCare = lazy(() => import("./pages/SpecializedCare.jsx"));
const Rehab = lazy(() => import("./pages/Rehab.jsx"));
const CareModule = lazy(() => import("./pages/CareModule.jsx"));

function PageSkeleton() {
  return (
    <div className="grid" style={{ gap: 22 }}>
      <SkeletonStatGrid />
      <SkeletonList />
    </div>
  );
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

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
        <Route path="/chat" element={<Chat />} />
        <Route path="/dashboard" element={<RequireRole role="patient"><PatientDashboard /></RequireRole>} />
        <Route path="/appointments" element={<RequireRole role="patient"><Appointments /></RequireRole>} />
        <Route path="/medications" element={<RequireRole role="patient"><Medications /></RequireRole>} />
        <Route path="/labs" element={<RequireRole role="patient"><Labs /></RequireRole>} />
        <Route path="/meals" element={<RequireRole role="patient"><Meals /></RequireRole>} />
        <Route path="/find-care" element={<RequireRole role="patient"><FindCare /></RequireRole>} />
        <Route path="/body-map" element={<RequireRole role="patient"><BodyMap /></RequireRole>} />
        <Route path="/monitoring" element={<RequireRole role="patient"><Monitoring /></RequireRole>} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/learn" element={<Learning />} />
        <Route path="/analytics" element={<RequireRole role="patient"><LazyPage><Analytics /></LazyPage></RequireRole>} />
        <Route path="/care/rehabilitation" element={<RequireRole role="patient"><LazyPage><Rehab /></LazyPage></RequireRole>} />
        {/* Role portals */}
        <Route path="/caregiver" element={<RequireRole role="caregiver"><LazyPage><CaregiverDashboard /></LazyPage></RequireRole>} />
        <Route path="/provider" element={<RequireRole role="provider"><LazyPage><DoctorDashboard /></LazyPage></RequireRole>} />
        {/* Open to everyone */}
        <Route path="/care" element={<LazyPage><SpecializedCare /></LazyPage>} />
        <Route path="/care/:moduleId" element={<LazyPage><CareModule /></LazyPage>} />
        <Route path="/accessibility" element={<Accessibility />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
