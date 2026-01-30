//frontend/src/auth/login.js

import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password, remember);
      if (!user) {
        setError("Email ose fjalëkalim i pasaktë.");
        setLoading(false);
        return;
      }

      // 🔀 Redirect based on role
      if (user.role === "customer") {
        navigate("/dashboard/customer");
      } else if (user.role === "company") {
        navigate("/dashboard/company");
      } else {
        navigate("/");
      }

    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Diçka shkoi keq gjatë kyçjes."
      );
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">

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
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200"
              placeholder="shembull@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="mb-4 relative">
            <label className="block mb-1 font-medium">Fjalëkalimi</label>
            <input
              type={showPass ? "text" : "password"}
              className="w-full px-4 py-2 border rounded-lg pr-10 focus:ring focus:ring-blue-200"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* REMEMBER */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
              />
              <span className="text-sm">Më mbaj mend</span>
            </label>

            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => alert("Rivendosja e fjalëkalimit nuk është implementuar ende")}
            >
              Keni harruar fjalëkalimin?
            </button>
          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            {loading ? "Duke u kyçur..." : "Hyni"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Nuk keni llogari?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            Regjistrohu
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
