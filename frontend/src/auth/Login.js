// frontend/src/auth/Login.js

import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";

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

    setError("");
    setLoading(true);

    try {
      const user = await login(email, password, remember);

      if (!user) {
        setError("Email ose fjalëkalim i pasaktë.");
        return;
      }

      // ✅ Enda redirecten – låt AuthRedirect ta över
      navigate("/");

    } catch (err) {
      console.error("Login error:", err);

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* BACK LINK */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={18} />
          <span>Kthehu në faqen kryesore</span>
        </button>

        <div className="bg-white shadow-xl rounded-2xl p-8">

          <h2 className="text-3xl font-bold text-center mb-2">
            Mirë se u kthyet 👋
          </h2>

          <p className="text-center text-gray-600 mb-6">
            Hyni për të vazhduar
          </p>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* EMAIL */}
            <div className="mb-4">
              <label className="block mb-1 font-medium">
                Email
              </label>

              <input
                type="email"
                disabled={loading}
                className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 disabled:opacity-60"
                placeholder="shembull@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="mb-4">

              <label className="block mb-1 font-medium">
                Fjalëkalimi
              </label>

              <div className="relative">

                <input
                  type={showPass ? "text" : "password"}
                  disabled={loading}
                  className="w-full px-4 py-2 border rounded-lg pr-10 focus:ring focus:ring-blue-200 disabled:opacity-60"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>

              </div>

            </div>

            {/* REMEMBER */}
            <div className="flex items-center justify-between mb-6">

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                />

                <span className="text-sm">
                  Më mbaj mend
                </span>
              </label>

              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Keni harruar fjalëkalimin?
              </Link>

            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && (
                <Loader2 size={20} className="animate-spin" />
              )}

              {loading ? "Duke u kyçur..." : "Hyni"}
            </button>

          </form>

          <p className="text-center text-gray-600 mt-6">
            Nuk keni llogari?{" "}
            <Link
              to="/register"
              className="text-blue-600 font-semibold hover:underline"
            >
              Regjistrohu
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;