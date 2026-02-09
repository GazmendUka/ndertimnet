// frontend/src/auth/RegisterSuccess.jsx

import { useState } from "react";
import api from "../api/axios";

export default function RegisterSuccess() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    // ✅ Enkel frontend-validering (UX)
    if (!email || !email.includes("@")) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await api.post(
        "/accounts/resend-verification-email/",
        { email }
      );
      setStatus(res.data.detail);
    } catch {
      setStatus(
        "Ndodhi një gabim. Ju lutem provoni përsëri."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-3">
          Kontrolloni email-in tuaj 📧
        </h1>

        <p className="text-gray-600 mb-6">
          Ju kemi dërguar një email verifikimi.
          Nëse nuk e shihni, kontrolloni edhe spam-in.
        </p>

        <input
          type="email"
          placeholder="Email-i juaj"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3"
        />

        <button
          onClick={resend}
          disabled={loading || !email || !email.includes("@")}
          className="w-full bg-gray-900 text-white py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Duke dërguar…" : "Dërgo email-in përsëri"}
        </button>

        {status && (
          <p className="text-sm text-gray-600 mt-4">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
