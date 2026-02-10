// frontend/src/routes/OnboardingGuard.jsx

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function OnboardingGuard() {
  const { onboardingStep, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return null;

  // ❌ Ej inloggad
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 1️⃣ Måste verifiera email
  if (onboardingStep === 1) {
    if (location.pathname !== "/verify-email") {
      return <Navigate to="/verify-email" replace />;
    }
  }

  // 2️⃣ Måste slutföra profil
  if (onboardingStep === 2) {
    const allowedPaths = [
      "/company/profile",
      "/customer/profile",
      "/logout",
    ];

    if (!allowedPaths.includes(location.pathname)) {
      const target =
        location.pathname.startsWith("/company")
          ? "/company/profile"
          : "/customer/profile";

      return <Navigate to={target} replace />;
    }
  }

  // 3️⃣ Full access
  return <Outlet />;
}
