import { useAuth } from "./AuthContext";
import { Navigate } from "react-router-dom";

export default function RedirectIfLoggedIn({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    if (user.role === "customer") return <Navigate to="/dashboard/customer" replace />;
    if (user.role === "company") return <Navigate to="/dashboard/company" replace />;
  }

  return children;
}
