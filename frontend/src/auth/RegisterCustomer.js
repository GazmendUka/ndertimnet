import React, { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function RegisterCustomer() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
  });

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

    try {
      // POST → backend/accounts/register/customer/
      const res = await api.post("accounts/register/customer/", formData);

      console.log("✅ Klienti u regjistrua me sukses!", res.data);

      // BACKEND RETURNERAR { success, message, data: {...} }
      // Vi bryr oss inte om tokens här → vi skickar användaren vidare
      navigate("/register/success", { state: { type: "customer" } });

    } catch (err) {
      console.error("❌ Gabim gjatë regjistrimit:", err);

      // backend använder: { success: False, message: "..."}
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
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl">
        
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          👤 Krijo llogarinë e klientit
        </h1>

        {error && (
          <p className="text-red-600 text-center mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 🧍 Emri & Mbiemri */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1">Emri *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">Mbiemri *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-400 outline-none"
              />
            </div>
          </div>

          {/* ☎️ Telefoni & Adresa */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1">Numri i telefonit</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">Adresa</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-400 outline-none"
              />
            </div>
          </div>

          {/* ✉️ Email & Fjalëkalimi */}
          <div className="grid md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-gray-700 mb-1">Fjalëkalimi *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-green-400 outline-none"
              />
            </div>
          </div>

          {/* 🔘 Butoni */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Duke u dërguar..." : "Regjistrohu si klient"}
          </button>

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
