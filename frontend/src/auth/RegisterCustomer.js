// src/pages/auth/RegisterCustomer.jsx

import React, { useState } from "react";
import api from "../api/axios";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Mail } from "lucide-react";

export default function RegisterCustomer() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔄 Uppdatera formulärfält
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 📤 Skicka in formuläret
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // ✅ Validering
    if (formData.password !== formData.confirm_password) {
      setError("Fjalëkalimet nuk përputhen.");
      setLoading(false);
      return;
    }

    try {
      await api.post("accounts/register/customer/", {
        email: formData.email,
        password: formData.password,

        // 🔥 Tillfällig workaround tills backend ändras
        first_name: "",
        last_name: "",
      });

      navigate("/register/success", { state: { type: "customer" } });

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Diçka shkoi keq. Kontrolloni të dhënat dhe provoni përsëri."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6 sm:px-6">
      <section className="w-full max-w-md rounded-2xl border border-[#e5e0d5] bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <img
            src="/ndertimnet-logo-full-width/ndertimnet-logo-search-transparent.png"
            alt="Ndertimnet"
            className="h-10 w-auto"
          />
          <Link
            to="/register"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#5f6f66] hover:bg-[#f7f4ee]"
          >
            <ArrowLeft size={18} />
            Kthehu
          </Link>
        </div>

        <p className="text-sm font-semibold text-[#ef7d22]">Për klientë</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#12251b]">
          Krijo llogarinë tënde
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5f6f66]">
          Publiko projektin dhe merr oferta nga kompani të interesuara.
        </p>

        {error && (
          <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">

          {/* ✉️ Email */}
          <div>
            <label htmlFor="customer-email" className="block text-sm font-medium text-[#12251b]">Email</label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a958f]" size={19} />
              <input
                id="customer-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                inputMode="email"
                placeholder="shembull@mail.com"
                className="min-h-[48px] w-full rounded-xl border border-[#d7d0c2] bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10"
              />
            </div>
          </div>

          {/* 🔐 Password */}
          <div>
            <label htmlFor="customer-password" className="block text-sm font-medium text-[#12251b]">Fjalëkalimi</label>

            <div className="relative">
              <input
                id="customer-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-[#d7d0c2] bg-white px-3 py-3 pr-12 text-base outline-none transition focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-1 top-2 flex w-11 items-center justify-center rounded-lg text-[#5f6f66] hover:bg-[#f7f4ee]"
                aria-label={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* 🔐 Confirm Password */}
          <div>
            <label htmlFor="customer-password-confirm" className="block text-sm font-medium text-[#12251b]">
              Konfirmo fjalëkalimin
            </label>

            <div className="relative">
              <input
                id="customer-password-confirm"
                type={showPassword ? "text" : "password"}
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-2 min-h-[48px] w-full rounded-xl border border-[#d7d0c2] bg-white px-3 py-3 pr-12 text-base outline-none transition focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-1 top-2 flex w-11 items-center justify-center rounded-lg text-[#5f6f66] hover:bg-[#f7f4ee]"
                aria-label={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* 🔘 Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#17643f] hover:bg-[#0f4f31]"
            }`}
          >
            {loading && <Loader2 className="animate-spin" size={19} />}
            {loading ? "Duke u dërguar..." : "Regjistrohu"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#5f6f66]">
          Ke tashmë llogari? <Link to="/login" className="font-semibold text-[#17643f] hover:underline">Kyçu</Link>
        </p>
      </section>
    </main>
  );
}
