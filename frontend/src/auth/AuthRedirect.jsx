import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LandingPage from "../pages/landing_page";

const AuthRedirect = () => {
  const { user, loading } = useAuth();

  // ⏳ Vänta tills auth är klar
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-600 text-lg">
          Duke u ngarkuar...
        </span>
      </div>
    );
  }

  // 👋 EJ INLOGGAD → LANDING PAGE
  if (!user) {
    return <LandingPage />;
  }

  // 🔀 INLOGGAD → RÄTT DASHBOARD
  if (user.role === "customer") {
    return <Navigate to="/customer" replace />;
  }

  if (user.role === "company") {
    return <Navigate to="/company" replace />;
  }

  // 🛟 fallback
  return <Navigate to="/" replace />;
};

export default AuthRedirect;