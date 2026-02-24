// frontend/src/pages/auth/ResetPassword.jsx

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!uid || !token) {
      setMessage("Linku është i pavlefshëm.");
      return;
    }

    if (password !== confirm) {
      setMessage("Fjalëkalimet nuk përputhen.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await api.post("/accounts/reset-password/", {
        uid,
        token,
        password,
      });

      setMessage(
        res.data?.message ||
          "Fjalëkalimi u përditësua me sukses."
      );

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Linku është i pavlefshëm ose ka skaduar."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">
          Vendos fjalëkalim të ri
        </h2>

        <p className="text-center text-gray-600 mb-6">
          Shkruani fjalëkalimin tuaj të ri
        </p>

        {message && (
          <div className="mb-4 text-sm text-gray-700 bg-gray-100 p-3 rounded text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            disabled={loading}
            placeholder="Fjalëkalimi i ri"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 disabled:opacity-60"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            required
            disabled={loading}
            placeholder="Konfirmo fjalëkalimin"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 disabled:opacity-60"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-60"
          >
            {loading ? "Duke ruajtur..." : "Ruaj fjalëkalimin"}
          </button>
        </form>
      </div>
    </div>
  );
}