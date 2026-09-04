// frontend/src/pages/auth/ForgotPassword.jsx

import React, { useState } from "react";
import api from "../../api/axios";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

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
      const res = await api.post("/accounts/password/forgot/", {
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6">
      <section className="w-full max-w-md rounded-2xl border border-[#e5e0d5] bg-white p-5 shadow-sm sm:p-8">
        <Link to="/login" className="mb-7 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#5f6f66] hover:bg-[#f7f4ee]">
          <ArrowLeft size={18} /> Kthehu
        </Link>
        <p className="text-sm font-semibold text-[#17643f]">Siguria e llogarisë</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#12251b]">
          Rivendos fjalëkalimin
        </h2>

        <p className="mb-6 mt-3 text-sm leading-6 text-[#5f6f66]">
          Shkruani email-in tuaj për të marrë linkun e rivendosjes
        </p>

        {message && (
          <div className="mb-4 rounded-xl border border-[#d8e5dd] bg-[#f4f9f6] p-4 text-sm leading-6 text-[#315c46]" role="status">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-[#12251b]">Email</label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a958f]" size={19} />
              <input id="forgot-email" type="email" required disabled={loading} placeholder="shembull@mail.com" autoComplete="email" inputMode="email" className="min-h-[48px] w-full rounded-xl border border-[#d7d0c2] bg-white py-3 pl-10 pr-3 text-base outline-none focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10 disabled:opacity-60" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#17643f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f4f31] disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={19} />}
            {loading ? "Duke dërguar..." : "Dërgo linkun"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="font-semibold text-[#17643f] hover:underline"
          >
            Kthehu te hyrja
          </Link>
        </div>
      </section>
    </main>
  );
}
