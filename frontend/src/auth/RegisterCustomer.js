// src/pages/auth/RegisterCustomer.jsx

import React, { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

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
      const res = await api.post("accounts/register/customer/", {
        email: formData.email,
        password: formData.password,

        // 🔥 Tillfällig workaround tills backend ändras
        first_name: "",
        last_name: "",
      });

      console.log("✅ Klienti u regjistrua me sukses!", res.data);

      navigate("/register/success", { state: { type: "customer" } });

    } catch (err) {
      console.error("❌ Gabim gjatë regjistrimit:", err);

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          👤 Krijo llogarinë
        </h1>

        {error && (
          <p className="text-red-600 text-center mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ✉️ Email */}
          <div>
            <label className="block text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-400 outline-none"
            />
          </div>

          {/* 🔐 Password */}
          <div>
            <label className="block text-gray-700 mb-1">Fjalëkalimi *</label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 pr-10 focus:ring-2 focus:ring-green-400 outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                👁
              </button>
            </div>
          </div>

          {/* 🔐 Confirm Password */}
          <div>
            <label className="block text-gray-700 mb-1">
              Konfirmo fjalëkalimin *
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 pr-10 focus:ring-2 focus:ring-green-400 outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                👁
              </button>
            </div>
          </div>

          {/* 🔘 Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Duke u dërguar..." : "Regjistrohu"}
          </button>

          {/* 🔙 Back */}
          <p
            onClick={() => navigate("/register")}
            className="text-center text-green-600 hover:text-green-800 mt-4 cursor-pointer"
          >
            ← Kthehu mbrapa
          </p>

        </form>
      </div>
    </div>
  );
}