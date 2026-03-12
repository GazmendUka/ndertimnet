import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function PrivateRoute({ roles }) {
  const { user, access, loading } = useAuth();

  // ------------------------------------------------
  // 1️⃣ Auth state laddar fortfarande
  // ------------------------------------------------
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-600">
        Po verifikohet sesioni...
      </div>
    );
  }

  // ------------------------------------------------
  // 2️⃣ Ingen token → inte inloggad
  // ------------------------------------------------
  if (!access) {
    return <Navigate to="/login" replace />;
  }

  // ------------------------------------------------
  // 3️⃣ Token finns men user saknas (vänta)
  // ------------------------------------------------
  if (access && !user) {
    return (
      <div className="p-10 text-center text-gray-600">
        Po ngarkohet profili...
      </div>
    );
  }

  // ------------------------------------------------
  // 4️⃣ Rollkontroll
  // ------------------------------------------------
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Nuk keni qasje në këtë faqe.
      </div>
    );
  }

  // ------------------------------------------------
  // 5️⃣ Allt OK
  // ------------------------------------------------
  return <Outlet />;
}