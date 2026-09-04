// frontend/src/pages/auth/ResetPassword.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { ArrowLeft, Loader2 } from "lucide-react";

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
      const res = await api.post("/accounts/password/reset/", {
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6">
      <section className="w-full max-w-md rounded-2xl border border-[#e5e0d5] bg-white p-5 shadow-sm sm:p-8">
        <Link to="/login" className="mb-7 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#5f6f66] hover:bg-[#f7f4ee]">
          <ArrowLeft size={18} /> Kthehu
        </Link>
        <p className="text-sm font-semibold text-[#17643f]">Siguria e llogarisë</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#12251b]">
          Vendos fjalëkalim të ri
        </h2>

        <p className="mb-6 mt-3 text-sm leading-6 text-[#5f6f66]">
          Shkruani fjalëkalimin tuaj të ri
        </p>

        {/* Tydliga direktiv / regler */}
        <div className="mb-4 rounded-xl border border-[#e5e0d5] bg-[#f7f4ee] p-4 text-sm leading-6 text-[#5f6f66]">
          <p className="font-semibold mb-1">Kërkesat për fjalëkalim:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mos përdorni emrin tuaj (p.sh. “Gazmend”).</li>
            <li>Përdorni një kombinim me shkronja dhe numra.</li>
            <li>Sa më i gjatë, aq më i sigurt.</li>
          </ul>
        </div>

        {message && (
          <div
            className={`mb-4 whitespace-pre-line rounded-xl p-4 text-sm leading-6 ${messageBoxClass}`}
            role={messageType === "error" ? "alert" : "status"}
          >
            {formatMessage(message)}
            {messageType === "success" && countdown !== null && countdown > 0 && (
              <div className="mt-2 text-xs opacity-80">
                Po ju ridrejtojmë te hyrja për {countdown} sekonda…
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-[#12251b]">Fjalëkalimi i ri</label>
          <input
            id="reset-password"
            type="password"
            required
            disabled={loading}
            className="mt-2 min-h-[48px] w-full rounded-xl border border-[#d7d0c2] px-4 py-3 text-base outline-none focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10 disabled:opacity-60"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          </div>

          <div>
          <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-[#12251b]">Konfirmo fjalëkalimin</label>
          <input
            id="reset-password-confirm"
            type="password"
            required
            disabled={loading}
            className="mt-2 min-h-[48px] w-full rounded-xl border border-[#d7d0c2] px-4 py-3 text-base outline-none focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10 disabled:opacity-60"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#17643f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f4f31] disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={19} />}
            {loading ? "Duke ruajtur..." : "Ruaj fjalëkalimin"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center">
          <Link to="/login" className="font-semibold text-[#17643f] hover:underline">
            Kthehu te hyrja
          </Link>
        </div>
      </section>
    </main>
  );
}
