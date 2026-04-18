// src/pages/profile/CompanyProfile.jsx

import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
// import { getMediaUrl } from "../../utils/media";

export default function CompanyProfile() {
  const { access, logout, user } = useAuth();
  const navigate = useNavigate();

  const [logoFile, setLogoFile] = useState(null);
  const logoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(null);

  const [professions, setProfessions] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("XK");

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
  const [file, setFile] = useState(null);


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
          org_number: companyData.org_number || "",
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
            logo_url: null,
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
  // SAFE DEFAULTS
  // --------------------------------------------------
  const safeCompany =
    company || {
      company_name: "",
      phone: "",
      website: "",
      address: "",
      description: "",
      logo_url: null,
      professions_detail: [],
      cities_detail: [],
      profile_step: 0,
      org_number: null,
    };

  const professionList = safeCompany.professions_detail || [];
  const cityList = safeCompany.cities_detail || [];

  const filteredCities = cities.filter(
    (c) => String(c.country).toUpperCase() === selectedCountry
  );

  const selectedCities = form?.cities
    ? cities.filter((c) => form.cities.includes(c.id))
    : [];

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
    if (!company || isLocked) return;

    setForm({
      company_name: safeCompany.company_name || "",
      phone: safeCompany.phone || "",
      website: safeCompany.website || "",
      address: safeCompany.address || "",
      description: safeCompany.description || "",
      org_number: safeCompany.org_number || "",
      professions: professionList.map((p) => p.id),
      cities: cityList.map((c) => c.id),
    });

    setIsEditing(true);
    setError("");
    setMessage("");
    setSelectedCountry("XK");
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

      // ============================================
      // 🟢 LOGO FINNS → FormData
      // ============================================
      const payload = new FormData();

      Object.entries(normalizedForm).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => payload.append(key, v)); // 👈 VIKTIGT: INTE key[]
        } else if (value !== null && value !== undefined) {
          payload.append(key, value);
        }
      });

      if (logoFile) {
        payload.append("logo", logoFile);
      }

      const res = await api.patch(
        "/accounts/profile/company/",
        payload,
      );

      const updated = res.data?.data || res.data;

      setCompany(updated);
      setIsEditing(false);
      setForm(null);
      setLogoFile(null);
      setMessage("Profili është përditësua me sukses.");

    } catch (err) {
      console.log("🔥 ERROR DATA:", err.response?.data);

      setError(
        JSON.stringify(err.response?.data) ||
        "Gabim gjatë ruajtjes së profilit."
      );
    } finally {
      setSaving(false);
    }
  };

    // ============================================
    // 🟢 UPLOAD REG.DOCUMENT
    // ============================================

  const hasDocument = !!company?.registration_document;
  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("registration_document", file);

    try {
      const res = await api.patch(`/accounts/profile/company/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updated = res.data?.data || res.data;

      setCompany(updated);
      setFile(null);
      fileInputRef.current.value = "";
      
      setError("");
      setMessage("Dokumenti u ngarkua me sukses.");
    } catch (err) {
      console.error(err);
      setMessage("");
      setError("Dokumenti nuk mund të ngarkohet.");
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setLogoFile(file);
  };

  // --------------------------------------------------
  // GUARDS
  // --------------------------------------------------
  if (loading) return <div className="p-6">Duke ngarkuar…</div>;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <>
      <div className="premium-container">
        <div className="premium-section space-y-8">

          {/* HEADER */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Profili i kompanisë
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
                {safeCompany.company_name || "—"}
              </h1>

              {user?.email_verified ? (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                  Email i verifikuar
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Email i paverifikuar
                </span>
              )}
            </div>
            {isLocked && (
              <p className="text-sm text-amber-700">
                Email-i nuk është i verifikuar. Profili është i kyçur derisa ta verifikoni.
              </p>
            )}
          </div>

          {/* CARD: LOGO + DELETE */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center ${
                    isEditing ? "cursor-pointer" : ""
                  }`}
                  onClick={() => isEditing && logoInputRef.current?.click()}
                  title={isEditing ? "Kliko për ta ndryshuar logon" : undefined}
                >
                  {safeCompany.logo_url ? (
                    <>
                      <img
                        src={safeCompany.logo_url}
                        alt={safeCompany.company_name || "logo"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      <div
                        className="w-full h-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600"
                        style={{ display: "none" }}
                      >
                        {(safeCompany.company_name?.[0] || "C").toUpperCase()}
                      </div>
                    </>
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

                  {isEditing ? (
                    <p className="text-xs text-gray-500">
                      Kliko logon për ta ndryshuar
                      {logoFile?.name ? (
                        <>
                          {" "}
                          • Zgjedhur: <span className="font-medium">{logoFile.name}</span>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Logo & identiteti i kompanisë
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CARD: BASIC INFO */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">
              Informacion bazë
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field
                label="Emri i kompanisë"
                name="company_name"
                isEditing={isEditing}
                value={isEditing ? form?.company_name : safeCompany.company_name}
                onChange={handleChange}
              />
              <Field
                label="Numri i biznesit (ORG)"
                name="org_number"
                isEditing={isEditing}
                value={isEditing ? form?.org_number : safeCompany.org_number}
                onChange={handleChange}
              />
              <Field
                label="Numri i telefonit"
                name="phone"
                isEditing={isEditing}
                value={isEditing ? form?.phone : safeCompany.phone}
                onChange={handleChange}
              />
              <Field
                label="Faqja e internetit"
                name="website"
                isEditing={isEditing}
                value={isEditing ? form?.website : safeCompany.website}
                onChange={handleChange}
                placeholder="https://example.com"
              />
              <Field
                label="Adresa"
                name="address"
                isEditing={isEditing}
                value={isEditing ? form?.address : safeCompany.address}
                onChange={handleChange}
                placeholder="Rruga, numri, qyteti"
              />
            </div>

            <div>
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
            </div>
          </div>

          {/* CARD: PROFESSIONS */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Specialitetet</h2>

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

          {/* CARD: CITIES */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Zona e shërbimit</h2>

            {isEditing ? (
                <div className="space-y-5">
                  {/* COUNTRY SELECTOR */}
                  <div className="inline-flex items-center rounded-full bg-gray-100 p-1 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setSelectedCountry("XK")}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                        selectedCountry === "XK"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Kosovo
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCountry("AL")}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                        selectedCountry === "AL"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Shqipëri
                    </button>
                  </div>

                  {/* SELECTED CITIES */}
                  {selectedCities.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Qytetet e zgjedhura ({selectedCities.length})
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {selectedCities.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCity(c.id)}
                            className="px-3 py-1.5 rounded-full text-sm font-medium 
                            bg-gray-900 text-white shadow-sm 
                            hover:opacity-80 transition-all duration-150 active:scale-[0.95]
                            flex items-center gap-1"
                          >
                            {c.name}
                            <span className="text-xs text-white/70 font-semibold">×</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FILTERED CITIES */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">
                      Zgjidh qytetet ku kompania juaj vepron
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {filteredCities.map((c) => {
                        const isSelected = form?.cities?.includes(c.id);

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCity(c.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium 
                            transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97] ${
                              isSelected
                                ? "bg-gray-900 text-white shadow-sm"
                                : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Verifikimi i kompanisë
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Ngarko certifikatën për të rritur besueshmërinë dhe për të marrë më shumë klientë
              </p>
            </div>

            {hasDocument ? (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                Verifikuar
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Jo e verifikuar
              </span>
            )}
          </div>

          {/* CONTENT */}
          {hasDocument ? (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
              Certifikata e regjistrimit është ngarkuar me sukses.
            </div>
          ) : (
            <div className="space-y-3">

              <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-600">
                Ngarko një dokument (.pdf, .jpg, .png) që vërteton regjistrimin e kompanisë.
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-sm text-gray-600"
              />

              {file && (
                <p className="text-xs text-gray-500">
                  Zgjedhur: <span className="font-medium">{file.name}</span>
                </p>
              )}

              <button
                onClick={handleUpload}
                disabled={!file}
                className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium 
                shadow-sm hover:shadow-md hover:bg-gray-800 active:scale-[0.98] transition 
                disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Ngarko dokumentin
              </button>
            </div>
          )}

        </div>

          {/* ACTIONS (EDIT MODE) */}
          {isEditing && (
            <div className="flex gap-3 pt-1">
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium 
                shadow-sm hover:shadow-md hover:bg-black active:scale-[0.98] transition disabled:opacity-40"
              >
                {saving ? "Duke ruajtur…" : "Ruaj"}
              </button>

              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium 
                shadow-sm hover:shadow-md active:scale-[0.98] hover:bg-gray-200 transition"
              >
                Anulo
              </button>
            </div>
          )}

          {/* BOTTOM ACTION ROW */}
          {!isEditing && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">

              {/* Left: Edit */}
              <button
                onClick={startEdit}
                disabled={saving || isLocked}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  saving || isLocked
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white shadow-sm hover:bg-black hover:shadow-md active:scale-[0.98]"
                }`}
              >
                <Pencil size={16} />
                Redakto
              </button>

              {/* Right: Delete */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium 
                bg-white border border-gray-200 text-gray-700 
                hover:border-red-300 hover:text-red-600 
                shadow-sm hover:shadow-md active:scale-[0.98] transition"
              >
                Fshi llogarinë
              </button>


            </div>
          )}

          {message && <p className="text-green-600 text-sm">{message}</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
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

            {deleteError && (
              <p className="text-red-600 text-sm mt-2">{deleteError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium 
                shadow-sm hover:shadow-md active:scale-[0.98] hover:bg-gray-200 transition"
              >
                Anulo
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-medium 
                shadow-sm hover:shadow-md hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
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

function Field({
  label,
  name,
  value,
  onChange,
  isEditing,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      {isEditing ? (
        <input
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
        />
      ) : (
        <p className="mt-1 text-sm">{value || "—"}</p>
      )}
    </label>
  );
}
