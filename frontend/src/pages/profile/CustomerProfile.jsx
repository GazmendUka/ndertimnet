// src/pages/profile/CustomerProfile.jsx

import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

export default function CustomerProfile() {
  const { access } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    email: "",
    email_verified: false,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load customer profile
  // --------------------------------------------------
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get("accounts/profile/customer/");
        setForm(res.data.data);
      } catch (err) {
        setError("Profili nuk mund të ngarkohet.");
      } finally {
        setLoading(false);
      }
    }

    if (access) loadProfile();
  }, [access]);

  // --------------------------------------------------
  // Handle changes
  // --------------------------------------------------
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // --------------------------------------------------
  // Save profile
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!form.address.trim()) {
      setError("Adresa nuk mund të jetë bosh.");
      return;
    }

    try {
      await api.put("accounts/profile/customer/", {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        address: form.address,
      });
      setMessage("Profili u përditësua me sukses!");
    } catch (err) {
      setError("Gabim gjatë ruajtjes së profilit.");
    }
  };

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------
  if (loading) {
    return <div className="p-4">Duke ngarkuar...</div>;
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-4">Profili i Klientit</h2>

      {message && <p className="text-green-600 mb-3">{message}</p>}
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          className="w-full border p-2 rounded"
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          placeholder="Emri"
        />

        <input
          className="w-full border p-2 rounded"
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          placeholder="Mbiemri"
        />

        {/* Email (read-only) */}
        <div>
          <input
            className="w-full border p-2 rounded bg-gray-100"
            value={form.email}
            disabled
          />
          <p className="text-sm mt-1">
            Statusi i emailit:{" "}
            {form.email_verified ? (
              <span className="text-green-600 font-medium">i verifikuar</span>
            ) : (
              <span className="text-red-600 font-medium">jo i verifikuar</span>
            )}
          </p>
        </div>

        <input
          className="w-full border p-2 rounded"
          name="phone"
          value={form.phone || ""}
          onChange={handleChange}
          placeholder="Numri i telefonit"
        />

        <input
          className="w-full border p-2 rounded"
          name="address"
          value={form.address || ""}
          onChange={handleChange}
          placeholder="Adresa *"
          required
        />

        <button className="w-full bg-blue-600 text-white p-2 rounded">
          Ruaj ndryshimet
        </button>
      </form>
    </div>
  );
}
