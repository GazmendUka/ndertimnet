// frontend/src/routes/OnboardingGuard.jsx

import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function OnboardingGuard() {
  const { loading } = useAuth();

  if (loading) return null;

  return <Outlet />;
}
