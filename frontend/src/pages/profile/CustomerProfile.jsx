// src/pages/profile/CustomerProfile.jsx

import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import SearchableSelect from "../../components/ui/SearchableSelect";

export default function CustomerProfile() {
  const { access, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    postal_code: "",
    city: null,
    email: "",
    email_verified: false,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showDeactivate, setShowDeactivate] = useState(false);
  const [password, setPassword] = useState("");
  const [cities, setCities] = useState([]);

  const handleDeactivate = async () => {
    setError("");

    if (!password.trim()) {
      setError("Ju lutem shkruani fjalëkalimin.");
      return;
    }

    try {
      await api.post("/accounts/delete/", {
        password,
        refresh,
      });

      setPassword("");
      setShowDeactivate(false);

      logout();
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Nuk ishte e mundur të çaktivizohej llogaria."
      );
    }
  };

  // --------------------------------------------------
  // Load customer profile
  // --------------------------------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const [resCities, resProfile] = await Promise.all([
          api.get("/locations/cities/"),
          api.get("accounts/profile/customer/"),
        ]);

        // cities
        setCities(resCities.data.results ?? resCities.data ?? []);

        // profile
        const profile = resProfile.data?.data || {};

        setForm({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          phone: profile.phone || "",
          address: profile.address || "",
          postal_code: profile.postal_code || "",
          city: profile.city_detail?.id || null,
          email: profile.email || "",
          email_verified: Boolean(profile.email_verified),
        });

      } catch (err) {
        setError("Profili nuk mund të ngarkohet.");
      } finally {
        setLoading(false);
      }
    };

    if (access) init();
  }, [access]);

  // --------------------------------------------------
  // Handle changes
  // --------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (message) setMessage("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // --------------------------------------------------
  // Save profile
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message) setMessage("");
    setError("");

    if (!form.address.trim()) {
      setError("Adresa nuk mund të jetë bosh.");
      return;
    }

    if (!form.postal_code.trim()) {
      setError("Kodi postar nuk mund të jetë bosh.");
      return;
    }

    setSaving(true);
    try {
      await api.put("accounts/profile/customer/", {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        address: form.address,
        postal_code: form.postal_code,
        city_id: form.city || null,
      });

      setMessage("Profili u përditësua me sukses!");
    } catch (err) {
      setError("Gabim gjatë ruajtjes së profilit.");
    } finally {
      setSaving(false);
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
          disabled={saving}
          className="w-full border p-2 rounded"
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          placeholder="Emri"
        />

        <input
          disabled={saving}
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
            disabled={true}
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
          disabled={saving}
          className="w-full border p-2 rounded"
          name="phone"
          value={form.phone || ""}
          onChange={handleChange}
          placeholder="Numri i telefonit"
        />

        <input
          disabled={saving}
          className="w-full border p-2 rounded"
          name="address"
          value={form.address || ""}
          onChange={handleChange}
          placeholder="Adresa *"
          required
        />

        <input
          disabled={saving}
          className="w-full border p-2 rounded"
          name="postal_code"
          value={form.postal_code || ""}
          onChange={handleChange}
          placeholder="Kodi postar"
        />

        <SearchableSelect
          disabled={saving}
          options={cities}
          value={form.city}
          onChange={(val) => {
            if (message) setMessage("");
            setForm((prev) => ({ ...prev, city: val || null }));
          }}
          placeholder="Zgjidh qytetin"
        />

        {form.city && (
          <p className="text-sm text-gray-500 mt-1">
            Zgjedhur: {cities.find(c => c.id === form.city)?.name || "—"}
          </p>
        )}

        <button
          disabled={loading || saving}
          className="w-full bg-gray-900 text-white hover:bg-gray-800 p-2 rounded disabled:opacity-50"
        >
          {saving ? "Duke ruajtur..." : "Ruaj ndryshimet"}
        </button>
      </form>
      {/* ========================================= */}
      {/* 🔴 Danger Zone */}
      {/* ========================================= */}

      <div className="mt-12 border-t pt-8">
        <h3 className="text-lg font-semibold mb-2">
          Çaktivizo llogarinë
        </h3>

        <p className="text-sm text-gray-600 mb-4">
          Kjo do të çaktivizojë llogarinë tuaj.
          Mund ta riaktivizoni përmes email-it.
        </p>

        <button
        disabled={saving}
        onClick={() => {
          setPassword("");
          setShowDeactivate(true);
        }}
          className="px-4 py-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg"
        >
          Çaktivizo llogarinë
        </button>
      </div>

      {showDeactivate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Konfirmo fjalëkalimin
            </h3>

            <input
              type="password"
              disabled={saving}
              placeholder="Fjalëkalimi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                disabled={saving}
                onClick={() => setShowDeactivate(false)}
                className="px-3 py-2 bg-gray-200 rounded-lg"
              >
                Anulo
              </button>

              <button
                onClick={handleDeactivate}
                disabled={!password.trim() || saving}
                className={`px-3 py-2 rounded-lg text-white ${
                  password.trim()
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-red-300 cursor-not-allowed"
                }`}
              >
                Konfirmo
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
