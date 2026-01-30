// Frontend/src/auth/VerifyEmail.jsx

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();

  useEffect(() => {
    const verify = async () => {
      try {
        await api.get(`accounts/verify-email/${token}/`);
        const updatedUser = await refreshMe();        
        if (updatedUser?.role === "company") {
          navigate("/dashboard/company", { replace: true });
        } else {
          navigate("/profile/customer", { replace: true });
        }
      } catch (err) {
        console.error("Email verification failed", err);
      }
    };

    if (token) verify();
  }, [token, refreshMe, navigate]);

  return (
    <div className="p-10 text-center">
      <h2 className="text-xl font-semibold">
        Po verifikohet adresa e email-it…
      </h2>
    </div>
  );
}
