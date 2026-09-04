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
      await api.post("/accounts/account/delete/", {
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
    <div className="premium-container max-w-2xl">
      <section className="premium-section">
      <p className="text-label">Llogaria ime</p>
      <h2 className="page-title mt-1">Profili i klientit</h2>
      <p className="mt-2 text-sm leading-6 text-gray-500">Mbani të dhënat tuaja të sakta për komunikim më të lehtë me kompanitë.</p>

      {message && <p className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800" role="status">{message}</p>}
      {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">

        <div className="grid gap-5 sm:grid-cols-2">
        <div>
        <label htmlFor="customer-first-name" className="mb-2 block text-sm font-medium text-gray-800">Emri</label>
        <input
          id="customer-first-name"
          disabled={saving}
          className="premium-input"
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          autoComplete="given-name"
        />
        </div>

        <div>
        <label htmlFor="customer-last-name" className="mb-2 block text-sm font-medium text-gray-800">Mbiemri</label>
        <input
          id="customer-last-name"
          disabled={saving}
          className="premium-input"
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          autoComplete="family-name"
        />
        </div>
        </div>

        {/* Email (read-only) */}
        <div>
          <label htmlFor="customer-profile-email" className="mb-2 block text-sm font-medium text-gray-800">Email</label>
          <input
            id="customer-profile-email"
            className="premium-input bg-gray-100 text-gray-600"
            value={form.email}
            disabled={true}
          />
          <p className="mt-2 text-sm text-gray-600">
            Statusi i emailit:{" "}
            {form.email_verified ? (
              <span className="text-green-600 font-medium">i verifikuar</span>
            ) : (
              <span className="text-red-600 font-medium">jo i verifikuar</span>
            )}
          </p>
        </div>

        <div>
        <label htmlFor="customer-phone" className="mb-2 block text-sm font-medium text-gray-800">Numri i telefonit</label>
        <input
          id="customer-phone"
          type="tel"
          disabled={saving}
          className="premium-input"
          name="phone"
          value={form.phone || ""}
          onChange={handleChange}
          autoComplete="tel"
          inputMode="tel"
        />
        </div>

        <div>
        <label htmlFor="customer-address" className="mb-2 block text-sm font-medium text-gray-800">Adresa</label>
        <input
          id="customer-address"
          disabled={saving}
          className="premium-input"
          name="address"
          value={form.address || ""}
          onChange={handleChange}
          autoComplete="street-address"
          required
        />
        </div>

        <div>
        <label htmlFor="customer-postal-code" className="mb-2 block text-sm font-medium text-gray-800">Kodi postar</label>
        <input
          id="customer-postal-code"
          disabled={saving}
          className="premium-input"
          name="postal_code"
          value={form.postal_code || ""}
          onChange={handleChange}
          autoComplete="postal-code"
        />
        </div>

        <div>
        <label className="mb-2 block text-sm font-medium text-gray-800">Qyteti</label>
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
          <p className="mt-2 text-sm text-gray-500">
            Zgjedhur: {cities.find(c => c.id === form.city)?.name || "—"}
          </p>
        )}
        </div>

        <button
          disabled={loading || saving}
          className="premium-btn btn-dark w-full disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Duke ruajtur..." : "Ruaj ndryshimet"}
        </button>
      </form>
      </section>
      {/* ========================================= */}
      {/* 🔴 Danger Zone */}
      {/* ========================================= */}

      <section className="rounded-2xl border border-red-100 bg-red-50/50 p-4 sm:p-6">
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
          className="inline-flex min-h-[44px] items-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Çaktivizo llogarinë
        </button>
      </section>

      {showDeactivate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h3 className="text-lg font-semibold mb-4">
              <span id="deactivate-title">
              Konfirmo fjalëkalimin
              </span>
            </h3>

            <input
              type="password"
              disabled={saving}
              placeholder="Fjalëkalimi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="premium-input mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                disabled={saving}
                onClick={() => setShowDeactivate(false)}
                className="min-h-[44px] rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold"
              >
                Anulo
              </button>

              <button
                onClick={handleDeactivate}
                disabled={!password.trim() || saving}
                className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white ${
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
