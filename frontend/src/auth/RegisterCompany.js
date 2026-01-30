// Frontend/src/auth/RegisterCompany.js

import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { fetchProfessions } from "../services/professionService";

export default function RegisterCompany() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    company_name: "",
    org_number: "",
    phone: "",
    description: "",
    logo: null,
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [professions, setProfessions] = useState([]);
  const [selectedProfessions, setSelectedProfessions] = useState([]);

  const toggleProfession = (id) => {
    setSelectedProfessions((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );
  };

  // Fetch professions
  useEffect(() => {
    fetchProfessions()
      .then(setProfessions)
      .catch(console.error);
  }, []);

  // 📌 Tekstinput
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 📌 Logo / File upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, logo: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  // 📌 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // FormData
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== "") {
          data.append(key, formData[key]);
        }
      });

      // validation 
      if (selectedProfessions.length === 0) {
        setError("Ju lutem zgjidhni të paktën një specialitet.");
        setLoading(false);
        return;
      }

      // add proffesions to post 
      selectedProfessions.forEach((id) => {
        data.append("professions", id);
      });

      // POST → /api/accounts/register/company/
      const res = await api.post("accounts/register/company/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Kompania u regjistrua me sukses!", res.data);

      navigate("/register/success", { state: { type: "company" } });

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
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          🏢 Krijo llogarinë e kompanisë
        </h1>

        {error && (
          <p className="text-red-600 text-center mb-4">{error}</p>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          encType="multipart/form-data"
        >
          {/* 🔹 Informacioni bazë */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1">
                Emri i kompanisë *
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">
                Numri i organizatës *
              </label>
              <input
                type="text"
                name="org_number"
                value={formData.org_number}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1">
                Numri i telefonit
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2 font-medium">
                Specialiteti (zgjidh një ose më shumë) *
              </label>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {professions.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProfessions.includes(p.id)}
                      onChange={() => toggleProfession(p.id)}
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* 🔹 Përshkrimi */}
          <div>
            <label className="block text-gray-700 mb-1">
              Përshkrimi i kompanisë
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Shkruani një përshkrim të shkurtër për kompaninë..."
            />
          </div>

          {/* 🔹 Email & Password */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none"
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
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
          </div>

          {/* 🔹 Logo */}
          <div>
            <label className="block text-gray-700 mb-1">Logo e kompanisë</label>
            <input
              type="file"
              name="logo"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600"
            />

            {preview && (
              <div className="mt-3 flex justify-center">
                <img
                  src={preview}
                  alt="Pamje paraprake"
                  className="w-24 h-24 object-cover rounded-lg border shadow"
                />
              </div>
            )}
          </div>

          {/* 🔘 Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Duke u dërguar..." : "Regjistro kompaninë"}
          </button>

          <p
            onClick={() => navigate("/register")}
            className="text-center text-blue-600 hover:text-blue-800 mt-4 cursor-pointer"
          >
            ← Kthehu mbrapa
          </p>
        </form>
      </div>
    </div>
  );
}
