import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// A component that protects routes by checking if the user is authenticated. If the user is not authenticated, it redirects them to the login page. If the authentication state is still loading, it renders nothing.
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}