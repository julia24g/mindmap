import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/dashboard/Dashboard";
import PublicDashboard from "./components/dashboard/PublicDashboard";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardIndex from "./components/dashboard/DashboardIndex";

function App() {
  return (
    <div className="min-h-screen bg-notion-bg">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardIndex />} />
            <Route path=":dashboardId" element={<Dashboard />} />
          </Route>
        </Route>
        <Route
          path="/public/dashboard/:publicSlug"
          element={<PublicDashboard />}
        />
      </Routes>
    </div>
  );
}

export default App;
