// src/components/PrivateRoute.js

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function PrivateRoute({ roles }) {
  const { user, access, loading } = useAuth();

  // 1️⃣ Auth state håller fortfarande på att laddas
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-600">
        Po verifikohet sesioni...
      </div>
    );
  }

  // 2️⃣ Ingen token = inte inloggad ⇒ omdirigera
  if (!access) {
    return <Navigate to="/" replace />;
  }


  // 3️⃣ Rollbaserad åtkomst
  if (roles && (!user || !roles.includes(user.role))) {
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Nuk keni qasje në këtë faqe.
      </div>
    );
  }

  // 4️⃣ Allt OK → släpp fram routed components via Outlet
  return <Outlet />;
}
