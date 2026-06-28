// frontend/src/auth/Login.js

import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";

const logoSrc = "/ndertimnet-logo-full-width/ndertimnet-logo-search-transparent.png";
const darkLogoSrc = "/ndertimnet-logo-full-width/ndertimnet-logo-search-white.png";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();

    setError("");

    if (!normalizedEmail || !password) {
      setError("Ju lutemi plotësoni emailin dhe fjalëkalimin.");
      return;
    }

    setLoading(true);

    try {
      const user = await login(normalizedEmail, password, remember);

      if (!user) {
        setError("Email ose fjalëkalim i pasaktë.");
        return;
      }

      navigate("/");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Diçka shkoi keq gjatë kyçjes."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <section className="grid w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[1fr_480px]">
          <div className="hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <Link to="/" className="inline-flex">
                <img
                  src={darkLogoSrc}
                  alt="Ndertimnet"
                  className="h-[61px] w-auto"
                />
              </Link>

              <div className="mt-16 max-w-md">
                <p className="text-sm font-medium uppercase tracking-wide text-blue-200">
                  Platformë ndërtimi
                </p>
                <h1 className="mt-4 text-4xl font-semibold leading-tight">
                  Hyni dhe vazhdoni menaxhimin e projekteve tuaja.
                </h1>
                <p className="mt-5 text-base leading-7 text-slate-300">
                  Qasuni te ofertat, kërkesat dhe profili juaj në një hapësirë
                  të qartë dhe të sigurt.
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-slate-300">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                Për kompani që duan të ndjekin kërkesat dhe ofertat.
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                Për klientë që kërkojnë profesionistë për ndërtim dhe renovim.
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-10 lg:px-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <Link
                to="/"
                className="inline-flex lg:hidden"
              >
                <img
                  src={logoSrc}
                  alt="Ndertimnet"
                  className="h-10 w-auto sm:h-12"
                />
              </Link>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                <ArrowLeft size={18} aria-hidden="true" />
                <span>Kthehu</span>
              </button>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-blue-700">
                Mirë se vini
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Kyçuni në llogarinë tuaj
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Shkruani emailin dhe fjalëkalimin për të vazhduar.
              </p>
            </div>

            {error && (
              <div
                className="mb-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                role="alert"
              >
                <AlertCircle
                  className="mt-0.5 h-5 w-5 flex-none"
                  aria-hidden="true"
                />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-slate-800"
                >
                  Email
                </label>

                <div className="relative mt-2">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="login-email"
                    type="email"
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-300 bg-white px-10 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
                    placeholder="shembull@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={!!error}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-800"
                >
                  Fjalëkalimi
                </label>

                <div className="relative mt-2">
                  <LockKeyhole
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="login-password"
                    type={showPass ? "text" : "password"}
                    disabled={loading}
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-12 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
                    placeholder="Fjalëkalimi juaj"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    aria-invalid={!!error}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    disabled={loading}
                    className="absolute inset-y-0 right-2 inline-flex w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={
                      showPass ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"
                    }
                    aria-pressed={showPass}
                  >
                    {showPass ? (
                      <EyeOff size={20} aria-hidden="true" />
                    ) : (
                      <Eye size={20} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={remember}
                    disabled={loading}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <span>Më mbaj mend</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                >
                  Keni harruar fjalëkalimin?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && (
                  <Loader2
                    size={20}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}

                {loading ? "Duke u kyçur..." : "Hyni"}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="text-center text-sm text-slate-600">
                Nuk keni llogari?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                >
                  Regjistrohu
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
