import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export const ProtectedRoute = () => {
  const { currentUser, loading } = useAuthContext();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
