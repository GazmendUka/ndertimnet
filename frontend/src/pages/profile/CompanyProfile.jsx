// src/pages/profile/CompanyProfile.jsx

import React, { useEffect, useState, useRef, useMemo } from "react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CompanyProfile() {
  const { access, logout, user } = useAuth();
  const navigate = useNavigate();

  const [logoFile, setLogoFile] = useState(null);
  const logoInputRef = useRef(null);

  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(null);

  const [professions, setProfessions] = useState([]);
  const [cities, setCities] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isLocked = !user?.email_verified;

  // --------------------------------------------------
  // DELETE ACCOUNT
  // --------------------------------------------------
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Ju lutem shkruani fjalëkalimin.");
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      await api.post("/accounts/delete/", { password: deletePassword });
      logout();
      navigate("/");
    } catch (err) {
      setDeleteError(
        err.response?.data?.message ||
          "Fjalëkalimi është i pasaktë ose ndodhi një gabim."
      );
    } finally {
      setDeleting(false);
    }
  };

  // --------------------------------------------------
  // LOAD PROFILE
  // --------------------------------------------------
  useEffect(() => {
    if (!access) return;

    let alive = true;

    const loadData = async () => {
      try {
        const [companyRes, professionsRes, citiesRes] = await Promise.all([
          api.get("/accounts/profile/company/"),
          api.get("/taxonomy/professions/"),
          api.get("/locations/cities/"),
        ]);

        if (!alive) return;

        const companyData = companyRes.data?.data || companyRes.data;

        setCompany(companyData);

        setForm({
          company_name: companyData.company_name || "",
          phone: companyData.phone || "",
          website: companyData.website || "",
          address: companyData.address || "",
          description: companyData.description || "",
          professions: (companyData.professions_detail || []).map((p) => p.id),
          cities: (companyData.cities_detail || []).map((c) => c.id),
        });

        setProfessions(professionsRes.data?.results || professionsRes.data || []);
        setCities(citiesRes.data?.results || citiesRes.data || []);
      } catch (err) {
        if (!alive) return;

        const status = err.response?.status;

        if (status === 403 && !user?.email_verified) {
          setCompany({
            company_name: "",
            phone: "",
            website: "",
            address: "",
            description: "",
            logo: null,
            professions_detail: [],
            cities_detail: [],
            profile_step: 0,
            org_number: null,
          });
          setForm(null);
          setError("");
        } else {
          setError("Profili i kompanisë nuk mund të ngarkohet.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();
    return () => (alive = false);
  }, [access, user?.email_verified]);

  // --------------------------------------------------
  // DERIVED
  // --------------------------------------------------
  const safeCompany =
    company || {
      company_name: "",
      phone: "",
      website: "",
      address: "",
      description: "",
      logo: null,
      professions_detail: [],
      cities_detail: [],
      profile_step: 0,
      org_number: null,
    };

  const professionList = safeCompany.professions_detail || [];
  const cityList = safeCompany.cities_detail || [];

  // --------------------------------------------------
  // EDIT HANDLERS
  // --------------------------------------------------
  const handleChange = (e) => {
    setForm((prev) =>
      prev ? { ...prev, [e.target.name]: e.target.value } : prev
    );
  };

  const toggleProfession = (id) => {
    setForm((prev) => {
      if (!prev) return prev;
      const list = prev.professions || [];
      return {
        ...prev,
        professions: list.includes(id)
          ? list.filter((p) => p !== id)
          : [...list, id],
      };
    });
  };

  const toggleCity = (id) => {
    setForm((prev) => {
      if (!prev) return prev;
      const list = prev.cities || [];
      return {
        ...prev,
        cities: list.includes(id)
          ? list.filter((c) => c !== id)
          : [...list, id],
      };
    });
  };

  const startEdit = () => {
    if (!company) return;

    setForm({
      company_name: safeCompany.company_name || "",
      phone: safeCompany.phone || "",
      website: safeCompany.website || "",
      address: safeCompany.address || "",
      description: safeCompany.description || "",
      professions: professionList.map((p) => p.id),
      cities: cityList.map((c) => c.id),
    });

    setIsEditing(true);
    setError("");
    setMessage("");
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setForm(null);
    setLogoFile(null);
    setError("");
    setMessage("");
  };

  const saveChanges = async () => {
    if (!form) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const normalizedForm = { ...form };

      if (
        normalizedForm.website &&
        !normalizedForm.website.startsWith("http://") &&
        !normalizedForm.website.startsWith("https://")
      ) {
        normalizedForm.website = "https://" + normalizedForm.website;
      }

      let payload = normalizedForm;
      let config = {};

      if (logoFile) {
        payload = new FormData();

        Object.entries(normalizedForm).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => payload.append(key, v));
          } else {
            payload.append(key, value);
          }
        });

        payload.append("logo", logoFile);
        config = { headers: { "Content-Type": "multipart/form-data" } };
      }

      const res = await api.patch(
        "/accounts/profile/company/",
        payload,
        config
      );

      const updated = res.data?.data || res.data;
      setCompany(updated);
      setIsEditing(false);
      setForm(null);
      setLogoFile(null);
      setMessage("Profili është përditësua me sukses.");
    } catch {
      setError("Gabim gjatë ruajtjes së profilit.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setLogoFile(file);
  };

  if (loading) return <div className="p-6">Duke ngarkuar…</div>;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <>
      <div className="premium-container">
        <div className="premium-section space-y-8">

          {/* HEADER */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <p className="text-label">Profili i kompanisë</p>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="page-title">
                  {safeCompany.company_name || "—"}
                </h1>

                {user?.email_verified ? (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                    Email i verifikuar
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Email i paverifikuar
                  </span>
                )}
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={startEdit}
                disabled={saving || isLocked}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition ${
                  saving || isLocked
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-black shadow-sm"
                }`}
              >
                <Pencil size={16} />
                Redakto
              </button>
            )}
          </div>

          {/* BASIC INFO CARD */}
          <div className="premium-card p-6 space-y-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Informacion bazë
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {["company_name", "phone", "website", "address"].map((field) => (
                <label key={field} className="block">
                  <span className="text-xs text-gray-500 capitalize">
                    {field.replace("_", " ")}
                  </span>

                  {isEditing ? (
                    <input
                      name={field}
                      value={form?.[field] || ""}
                      onChange={handleChange}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="mt-1 text-sm">
                      {safeCompany[field] || "—"}
                    </p>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* PROFESSIONS */}
          <div className="premium-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Specialitetet
            </h2>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {professions.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form?.professions?.includes(p.id) || false}
                      onChange={() => toggleProfession(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {professionList.length ? (
                  professionList.map((p) => (
                    <span
                      key={p.id}
                      className="px-3 py-1 bg-gray-100 border rounded-full text-sm"
                    >
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">—</span>
                )}
              </div>
            )}
          </div>

          {/* CITIES */}
          <div className="premium-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Zona e shërbimit
            </h2>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cities.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form?.cities?.includes(c.id) || false}
                      onChange={() => toggleCity(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cityList.length ? (
                  cityList.map((c) => (
                    <span
                      key={c.id}
                      className="px-3 py-1 bg-gray-100 border rounded-full text-sm"
                    >
                      {c.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">—</span>
                )}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-3">
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium"
              >
                {saving ? "Duke ruajtur…" : "Ruaj"}
              </button>

              <button
                onClick={cancelEdit}
                className="px-5 py-2 rounded-lg bg-gray-200 text-sm font-medium"
              >
                Anulo
              </button>
            </div>
          )}

          {message && <p className="text-green-600 text-sm">{message}</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </div>
    </>
  );
}
