// frontend/src/auth/RegisterCompany.js
// ✅ Production-ready – Account-only registration
// Fields: company_name, phone, email, password

import React, { useState } from "react";
import api from "../api/axios";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Building2, Eye, EyeOff, Loader2, Mail, Phone } from "lucide-react";

export default function RegisterCompany() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    company_name: "",
    phone: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 Text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post(
        "accounts/register/company/",
        formData,
        { skipAuth: true }
      );
      navigate("/register/success", { state: { type: "company" } });
    } catch (err) {
      const data = err.response?.data;
      const fieldError =
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        Object.values(data)?.flat()?.[0];

      setError(
        fieldError ||
          data?.detail ||
          "Diçka shkoi keq. Kontrolloni të dhënat dhe provoni përsëri."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6 sm:px-6">
      <section className="w-full max-w-2xl rounded-2xl border border-[#e5e0d5] bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <img src="/ndertimnet-logo-full-width/ndertimnet-logo-search-transparent.png" alt="Ndertimnet" className="h-10 w-auto" />
          <Link to="/register" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#5f6f66] hover:bg-[#f7f4ee]">
            <ArrowLeft size={18} /> Kthehu
          </Link>
        </div>

        <p className="text-sm font-semibold text-[#17643f]">Për kompani</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#12251b]">Krijo llogarinë e kompanisë</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f6f66]">Krijoni profilin bazë tani. Të dhënat e tjera mund t'i plotësoni më vonë.</p>

        {error && (
          <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <AlertCircle className="mt-0.5 shrink-0" size={19} /><p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="company-name" className="block text-sm font-medium text-[#12251b]">Emri i kompanisë</label>
              <div className="relative mt-2">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a958f]" size={19} />
                <input id="company-name" type="text" name="company_name" value={formData.company_name} onChange={handleChange} required autoComplete="organization" className="min-h-[48px] w-full rounded-xl border border-[#d7d0c2] bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="company-phone" className="block text-sm font-medium text-[#12251b]">Numri i telefonit <span className="font-normal text-[#8a958f]">(opsional)</span></label>
              <div className="relative mt-2">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a958f]" size={19} />
                <input id="company-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} autoComplete="tel" inputMode="tel" className="min-h-[48px] w-full rounded-xl border border-[#d7d0c2] bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10" />
              </div>
            </div>

            <div>
              <label htmlFor="company-email" className="block text-sm font-medium text-[#12251b]">Email</label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a958f]" size={19} />
                <input id="company-email" type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="email" inputMode="email" className="min-h-[48px] w-full rounded-xl border border-[#d7d0c2] bg-white py-3 pl-10 pr-3 text-base outline-none transition focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10" />
              </div>
            </div>

            <div>
              <label htmlFor="company-password" className="block text-sm font-medium text-[#12251b]">Fjalëkalimi</label>

              <div className="relative mt-2">
                <input
                  id="company-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="min-h-[48px] w-full rounded-xl border border-[#d7d0c2] bg-white px-3 py-3 pr-12 text-base outline-none transition focus:border-[#17643f] focus:ring-2 focus:ring-[#17643f]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-[#5f6f66] hover:bg-[#f7f4ee]"
                  aria-label={
                    showPassword
                      ? "Fshih fjalëkalimin"
                      : "Shfaq fjalëkalimin"
                  }
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
            {loading ? "Duke u dërguar..." : "Regjistro kompaninë"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#5f6f66]">Ke tashmë llogari? <Link to="/login" className="font-semibold text-[#17643f] hover:underline">Kyçu</Link></p>
      </section>
    </main>
  );
}
