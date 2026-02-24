// frontend/src/pages/auth/ForgotPassword.jsx

import React, { useState } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await api.post("/accounts/forgot-password/", {
        email,
      });

      setMessage(
        res.data?.message ||
          "Nëse email ekziston, do të merrni një link për rivendosje."
      );

      setEmail("");
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Ndodhi një gabim. Ju lutem provoni përsëri."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">
          Rivendos fjalëkalimin
        </h2>

        <p className="text-center text-gray-600 mb-6">
          Shkruani email-in tuaj për të marrë linkun e rivendosjes
        </p>

        {message && (
          <div className="mb-4 text-sm text-gray-700 bg-gray-100 p-3 rounded text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            disabled={loading}
            placeholder="Email-i juaj"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 disabled:opacity-60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-60"
          >
            {loading ? "Duke dërguar..." : "Dërgo linkun"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center">
          <Link
            to="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            Kthehu te hyrja
          </Link>
        </div>
      </div>
    </div>
  );
}