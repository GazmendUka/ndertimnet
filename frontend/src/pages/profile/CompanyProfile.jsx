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
  // DELETE COMPANY ACCOUNT
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
  // Load company profile + professions + cities
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

        // 🔒 Email ej verifierad: backend kan svara 403 -> vi visar sidan men låser editing
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

          // vi vill INTE visa feltext i detta läge
          setError("");
        } else {
          setError("Profili i kompanisë nuk mund të ngarkohet.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, [access, user?.email_verified]);

  // --------------------------------------------------
  // Derived
  // --------------------------------------------------
  const profileStep = useMemo(() => {
    const step = company?.profile_step;
    return Number.isInteger(step) ? step : 0;
  }, [company]);

  const professionList = company?.professions_detail || [];
  const cityList = company?.cities_detail || [];

  // --------------------------------------------------
  // Handlers
  // --------------------------------------------------
  const handleChange = (e) => {
    setForm((prev) => (prev ? { ...prev, [e.target.name]: e.target.value } : prev));
  };

  const toggleProfession = (id) => {
    setForm((prev) => {
      if (!prev) return prev;
      const list = prev.professions || [];
      return {
        ...prev,
        professions: list.includes(id) ? list.filter((p) => p !== id) : [...list, id],
      };
    });
  };

  const toggleCity = (id) => {
    setForm((prev) => {
      if (!prev) return prev;
      const list = prev.cities || [];
      return {
        ...prev,
        cities: list.includes(id) ? list.filter((c) => c !== id) : [...list, id],
      };
    });
  };

  const startEdit = () => {
    if (!company) return;

    setForm({
      company_name: company.company_name || "",
      phone: company.phone || "",
      website: company.website || "",
      address: company.address || "",
      description: company.description || "",
      professions: (company.professions_detail || []).map((p) => p.id),
      cities: (company.cities_detail || []).map((c) => c.id),
    });

    setIsEditing(true);
    setMessage("");
    setError("");
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setForm(null);
    setLogoFile(null);
    setMessage("");
    setError("");
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

      let payload;
      let config = {};

      if (logoFile) {
        payload = new FormData();

        Object.entries(normalizedForm).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => payload.append(key, v));
          } else if (value !== null && value !== undefined) {
            payload.append(key, value);
          }
        });

        payload.append("logo", logoFile);

        config = { headers: { "Content-Type": "multipart/form-data" } };
      } else {
        payload = normalizedForm;
      }

      const res = await api.patch("/accounts/profile/company/", payload, config);
      const updated = res.data?.data || res.data;

      setCompany(updated);
      setIsEditing(false);
      setLogoFile(null);
      setForm(null);
      setMessage("Profili është përditësua me sukses.");
    } catch (err) {
      setError("Gabim gjatë ruajtjes së profilit.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setLogoFile(file);
  };

  // --------------------------------------------------
  // Guards
  // --------------------------------------------------
  if (loading) return <div className="p-6">Duke ngarkuar…</div>;

  // om email är verifierad men company inte finns -> riktig error
  if (!company && !isLocked) {
    return <div className="p-6 text-red-600">Profili nuk u gjet.</div>;
  }

  // fallback om company ändå är null (ska ej hända, men safe)
  const safeCompany =
    company ||
    ({
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

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <>
      <div className="premium-container">
        <div className="premium-section space-y-8">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label mb-1">Profili</p>
              <h1 className="page-title">Profili i Kompanisë</h1>

              {profileStep === 4 && (
                <div className="mt-2 inline-flex text-xs font-semibold px-3 py-1 rounded-full bg-green-50 text-green-800 border border-green-200">
                  Profili është i plotë
                </div>
              )}

              {isLocked && (
                <p className="mt-2 text-sm text-amber-700">
                  Email-i nuk është i verifikuar. Profili është i kyçur derisa ta verifikoni.
                </p>
              )}
            </div>

            {!isEditing && (
              <button
                onClick={startEdit}
                disabled={saving || isLocked}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition ${
                  saving || isLocked
                    ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                    : "text-gray-800 bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
                }`}
              >
                Redakto
              </button>
            )}
          </div>

          {/* CARD */}
          <div className="premium-card p-6 space-y-8">
            {/* Logo row */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`relative w-20 h-20 rounded-full overflow-hidden border flex items-center justify-center ${
                    isEditing ? "cursor-pointer" : ""
                  }`}
                  onClick={() => isEditing && logoInputRef.current?.click()}
                  title={isEditing ? "Kliko për ta ndryshuar logon" : undefined}
                >
                  {safeCompany.logo ? (
                    <img
                      src={safeCompany.logo}
                      alt={safeCompany.company_name || "logo"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
                      {(safeCompany.company_name?.[0] || "C").toUpperCase()}
                    </div>
                  )}

                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Pencil className="text-white" size={24} />
                    </div>
                  )}

                  {isEditing && (
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {safeCompany.company_name || "—"}
                  </p>
                  {isEditing && (
                    <p className="text-xs text-gray-500">
                      Kliko logon për ta ndryshuar
                      {logoFile?.name ? (
                        <>
                          {" "}
                          • Zgjedhur: <span className="font-medium">{logoFile.name}</span>
                        </>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-red-600 hover:underline text-sm"
              >
                Fshi llogarinë
              </button>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="block">
                <span className="text-xs text-gray-500">Emri i kompanisë</span>
                {isEditing ? (
                  <input
                    name="company_name"
                    value={form?.company_name || ""}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
                  />
                ) : (
                  <p className="mt-1 text-sm">{safeCompany.company_name || "—"}</p>
                )}
              </label>

              <label className="block">
                <span className="text-xs text-gray-500">Numri i telefonit</span>
                {isEditing ? (
                  <input
                    name="phone"
                    value={form?.phone || ""}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
                  />
                ) : (
                  <p className="mt-1 text-sm">{safeCompany.phone || "—"}</p>
                )}
              </label>

              <label className="block">
                <span className="text-xs text-gray-500">Faqja e internetit</span>
                {isEditing ? (
                  <input
                    name="website"
                    type="url"
                    placeholder="https://example.com"
                    value={form?.website || ""}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
                  />
                ) : safeCompany.website ? (
                  <p className="mt-1 text-sm">
                    <a
                      href={safeCompany.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-inherit"
                    >
                      {safeCompany.website}
                    </a>
                  </p>
                ) : (
                  <p className="mt-1 text-sm">—</p>
                )}
              </label>

              <label className="block">
                <span className="text-xs text-gray-500">Adresa</span>
                {isEditing ? (
                  <input
                    name="address"
                    placeholder="Rruga, numri, qyteti"
                    value={form?.address || ""}
                    onChange={handleChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
                  />
                ) : (
                  <p className="mt-1 text-sm">{safeCompany.address || "—"}</p>
                )}
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-gray-500">Përshkrimi</span>
              {isEditing ? (
                <textarea
                  name="description"
                  rows="4"
                  value={form?.description || ""}
                  onChange={handleChange}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
                />
              ) : (
                <p className="mt-1 text-sm">{safeCompany.description || "—"}</p>
              )}
            </label>

            {/* Professions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Specialitetet</h3>

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
                        className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm"
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

            {/* Cities */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Qytete ku veprojnë</h3>

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
                        className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm"
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

            {/* Legal */}
            <div className="border-t pt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Të dhëna juridike</h3>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Numri i biznesit</span>

                {safeCompany.org_number ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm border border-green-200">
                    {safeCompany.org_number}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm border border-yellow-200">
                    Jo i plotë
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {isEditing && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black disabled:opacity-50"
                >
                  {saving ? "Duke ruajtur…" : "Ruaj"}
                </button>

                <button
                  onClick={cancelEdit}
                  className="px-5 py-2 rounded-lg bg-gray-200 text-sm font-medium hover:bg-gray-300"
                >
                  Anulo
                </button>
              </div>
            )}

            {message && <p className="text-green-600 text-sm">{message}</p>}
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-red-600">
              Konfirmo fshirjen e llogarisë
            </h2>

            <p className="text-sm text-gray-600 mt-2">
              Ky veprim do të çaktivizojë llogarinë tuaj. Ju lutem shkruani fjalëkalimin për ta konfirmuar.
            </p>

            <input
              type="password"
              placeholder="Fjalëkalimi"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="mt-4 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500"
            />

            {deleteError && <p className="text-red-600 text-sm mt-2">{deleteError}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Anulo
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Duke fshirë..." : "Fshi llogarinë"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
