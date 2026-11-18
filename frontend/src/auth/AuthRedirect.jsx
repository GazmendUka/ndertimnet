import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LandingPage from "../pages/landing_page";
import { readGuestProject } from "../utils/guestProject";
import { IS_IOS_STORE_SANDBOX } from "../config/api";

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
    if (IS_IOS_STORE_SANDBOX && !user.email_verified) return <Navigate to="/verify-email" replace />;
    return <Navigate to={readGuestProject() ? "/nis-projektin" : "/customer"} replace />;
  }

  if (user.role === "company") {
    if (IS_IOS_STORE_SANDBOX && !user.email_verified) return <Navigate to="/verify-email" replace />;
    return <Navigate to="/company" replace />;
  }

  // 🛟 fallback
  return <Navigate to="/" replace />;
};

export default AuthRedirect;
