// frontend/src/pages/auth/ResetPassword.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const REDIRECT_SECONDS = 4;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(null); // string | string[]
  const [messageType, setMessageType] = useState(null); // "success" | "error"
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const normalizeMessage = (msg) => {
    if (!msg) return null;
    return Array.isArray(msg) ? msg : String(msg);
  };

  const formatMessage = (msg) => {
    if (!msg) return "";
    return Array.isArray(msg) ? msg.join("\n") : msg;
  };

  // Countdown redirect efter success
  useEffect(() => {
    if (messageType !== "success") return;

    setCountdown(REDIRECT_SECONDS);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    const timeout = setTimeout(() => {
      navigate("/login");
    }, REDIRECT_SECONDS * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [messageType, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Basic guards
    if (!uid || !token) {
      setMessageType("error");
      setMessage("Linku është i pavlefshëm.");
      return;
    }

    if (password !== confirm) {
      setMessageType("error");
      setMessage("Fjalëkalimet nuk përputhen.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setMessageType(null);

    try {
      const res = await api.post("/accounts/reset-password/", {
        uid,
        token,
        password,
      });

      setMessageType("success");
      setMessage(
        normalizeMessage(
          res.data?.message || "Fjalëkalimi u përditësua me sukses."
        )
      );

      // Rensa input på success
      setPassword("");
      setConfirm("");
    } catch (err) {
      // Backend kan returnera message som array (t.ex. password validators)
      const backendMsg = err.response?.data?.message;

      setMessageType("error");
      setMessage(
        normalizeMessage(
          backendMsg || "Linku është i pavlefshëm ose ka skaduar."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const messageBoxClass =
    messageType === "success"
      ? "bg-green-50 text-green-800 border border-green-200"
      : "bg-red-50 text-red-800 border border-red-200";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-2">
          Vendos fjalëkalim të ri
        </h2>

        <p className="text-center text-gray-600 mb-6">
          Shkruani fjalëkalimin tuaj të ri
        </p>

        {/* Tydliga direktiv / regler */}
        <div className="mb-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 p-3 rounded">
          <p className="font-semibold mb-1">Kërkesat për fjalëkalim:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mos përdorni emrin tuaj (p.sh. “Gazmend”).</li>
            <li>Përdorni një kombinim me shkronja dhe numra.</li>
            <li>Sa më i gjatë, aq më i sigurt.</li>
          </ul>
        </div>

        {message && (
          <div
            className={`mb-4 text-sm p-3 rounded text-center whitespace-pre-line ${messageBoxClass}`}
          >
            {formatMessage(message)}
            {messageType === "success" && countdown !== null && countdown > 0 && (
              <div className="mt-2 text-xs opacity-80">
                Po ju ridrejtojmë te hyrja për {countdown} sekonda…
              </div>
            )}
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
            autoComplete="new-password"
          />

          <input
            type="password"
            required
            disabled={loading}
            placeholder="Konfirmo fjalëkalimin"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 disabled:opacity-60"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-60"
          >
            {loading ? "Duke ruajtur..." : "Ruaj fjalëkalimin"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center">
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Kthehu te hyrja
          </Link>
        </div>
      </div>
    </div>
  );
}