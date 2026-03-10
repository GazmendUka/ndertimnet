// frontend/src/routes/OnboardingGuard.jsx

import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function OnboardingGuard() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-600">
        Po ngarkohet profili...
      </div>
    );
  }

  return <Outlet />;
}