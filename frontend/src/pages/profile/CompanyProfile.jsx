// src/pages/profile/CompanyProfile.jsx

import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";


const PROFILE_STEPS = {
  0: 20,
  1: 40,
  2: 60,
  3: 80,
  4: 100,
};
const STEP_HINTS = {
  0: "Shto përshkrimin dhe specialitetet",
  1: "Shto qytetin",
  2: "Shto logon",
};

export default function CompanyProfile() {
  const { access, logout } = useAuth();
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
      await api.post("accounts/delete/", {
        password: deletePassword,
      });

      // 🔐 Rensa auth state korrekt
      logout();

      // 🔁 Redirect
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
  // Load company profile + professions
  // --------------------------------------------------
  useEffect(() => {
    if (!access) return;

    const loadData = async () => {
      try {
        const [companyRes, professionsRes, citiesRes] = await Promise.all([
          api.get("accounts/profile/company/"),
          api.get("taxonomy/professions/"),
          api.get("locations/cities/"),
        ]);

        const companyData = companyRes.data.data;

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

        setProfessions(professionsRes.data.results);
        setCities(citiesRes.data.results || citiesRes.data);
      } catch (err) {
        setError("Profili i kompanisë nuk mund të ngarkohet.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [access]);

  // --------------------------------------------------
  // Handlers
  // --------------------------------------------------
  const handleChange = (e) => {
    setForm((prev) => prev ? { ...prev, [e.target.name]: e.target.value } : prev);
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
    setMessage("");
    setError("");
  };

  const saveChanges = async () => {
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
      let headers = {};

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

        headers["Content-Type"] = "multipart/form-data";
      } else {
        payload = normalizedForm;
      }

      const res = await api.patch(
        "accounts/profile/company/",
        payload,
        { headers }
      );

      setCompany(res.data.data);
      setIsEditing(false);
      setLogoFile(null);
      setMessage("Profili është përditësua me sukses.");
    } catch (err) {
      setError("Gabim gjatë ruajtjes së profilit.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------
  if (loading) {
    return <div className="p-6">Duke ngarkuar…</div>;
  }

  if (!company) {
    return <div className="p-6 text-red-600">Profili nuk u gjet.</div>;
  }


  // 🔐 Safe defaults (nu är company garanterat definierad)
  const professionList = company.professions_detail || [];
  const profileStep = Number.isInteger(company.profile_step)
    ? company.profile_step
    : 0;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto bg-white p-8 space-y-6">
    {/* Header */}
    <div className="space-y-4">
      {profileStep === 4 && (
        <span className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full">
          Profili është i plotë
        </span>
      )}

      {/* Title + actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profili i Kompanisë</h2>

          {profileStep === 0 && (
            <p className="mt-1 text-sm text-yellow-700">
              Verifikoni email-in dhe plotësoni emrin e kompanisë për të vazhduar.
            </p>
          )}
        </div>

        {/* Logo + edit */}
        <div className="space-y-2">
          <div
            className={`
              relative w-20 h-20 rounded-full overflow-hidden border
              flex items-center justify-center
              ${isEditing ? "cursor-pointer group" : ""}
            `}
            onClick={() => isEditing && logoInputRef.current?.click()}
            title={isEditing ? "Kliko për ta ndryshuar logon" : undefined}
          >
            {/* Image / fallback */}
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.company_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
                {company.company_name?.[0]?.toUpperCase()}
              </div>
            )}

            {/* Overlay + centered pencil (EDIT MODE) */}
            {isEditing && (
              <div
                className="
                  absolute inset-0
                  bg-black/40 backdrop-blur-[1px]
                  flex items-center justify-center
                  opacity-100
                "
              >
                <Pencil className="text-white" size={28} />
              </div>
            )}

            {/* Hidden file input */}
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

          <div className="pt-8 border-t">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:underline text-sm"
            >
              Fshi llogarinë
            </button>
          </div>

          {/* Instruction */}
          {isEditing && (
            <p className="text-xs text-gray-500">
              Kliko logon për ta ndryshuar
            </p>
          )}

          {/* Selected file feedback */}
          {isEditing && logoFile?.name && (
            <p className="text-xs text-gray-600">
              Zgjedhur: <span className="font-medium">{logoFile.name}</span>
            </p>
          )}
        </div>

      </div>
    </div>
      {/* Company info */}
      <div className="space-y-6 border-b pb-6">
        <label className="block">
          <span className="text-sm text-gray-600">Emri i kompanisë</span>
          {isEditing ? (
            <input
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
            />
          ) : (
            <p className="font-medium">{company.company_name}</p>
          )}
        </label>

        {profileStep === 1 && !isEditing && (
          <p className="text-sm text-yellow-700 mt-1">
            Shtoni numrin e telefonit dhe faqen e internetit.
          </p>
        )}

        <label className="block">
          <span className="text-sm text-gray-600">Numri i telefonit</span>
          {isEditing ? (
            <input
              name="phone"
              value={form.phone || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
            />
          ) : (
            <p>{company.phone || "—"}</p>
          )}
        </label>

        <label className="block space-y-1">
            <span className="text-sm text-gray-600">Faqja e internetit</span>

            {isEditing ? (
              <input
                name="website"
                type="url"
                placeholder="https://example.com"
                value={form.website || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
              />
            ) : company.website ? (
              <p>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-inherit"
                >
                  {company.website}
                </a>
              </p>
            ) : (
              <p>—</p>
            )}
          </label>
        
        <label className="block">
          <span className="text-sm text-gray-600">Adresa</span>

          {isEditing ? (
            <input
              name="address"
              placeholder="Rruga, numri, qyteti"
              value={form.address || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
            />
          ) : (
            <p>{company.address || "—"}</p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Përshkrimi</span>
          {isEditing ? (
            <textarea
              name="description"
              value={form.description || ""}
              onChange={handleChange}
              rows="4"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-800"
            />
          ) : (
            <p>{company.description || "—"}</p>
          )}
        </label>
      </div>
      
      {profileStep === 2 && !isEditing && (
        <p className="text-sm text-yellow-700 mb-2">
          Përshkrimi, specialitetet dhe qytetet janë të detyrueshme.
        </p>
      )}

      {/* Professions */}
      <div>
        <h3 className="font-semibold mb-2">Specialitetet</h3>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            {professions.map((p) => (
              <label key={p.id} className="flex items-center gap-2">
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
                  className="px-3 py-1 bg-gray-200 rounded-full text-sm"
                >
                  {p.name}
                </span>
              ))
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        )}
      </div>

      {/* Serviceområde */}
      <div>
        <h3 className="font-semibold mb-2">Qytete ku veprojnë</h3>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
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
            {company.cities_detail?.length ? (
              company.cities_detail.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1 bg-gray-200 rounded-full text-sm"
                >
                  {c.name}
                </span>
              ))
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        )}
      </div>
      
      <div className="border-t pt-4 space-y-2">
        <h3 className="font-semibold">Të dhëna juridike</h3>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Numri i biznesit</span>

          {company.org_number ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {company.org_number}
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
              Jo i plotë
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {isEditing && (
        <div className="flex gap-3 pt-4">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="px-5 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {saving ? "Duke ruajtur…" : "Ruaj"}
          </button>
          <button
            onClick={cancelEdit}
            className="px-5 py-2 rounded bg-gray-300"
          >
            Anulo
          </button>
        </div>
      )}

      {/* Bottom left – Edit button */}
      {!isEditing && (
        <div className="flex justify-start pt-6">
          <button
            onClick={startEdit}
            disabled={saving}
            className="
              inline-flex items-center gap-2
              px-5 py-2.5
              rounded-full
              text-sm font-medium
              text-gray-800
              bg-gray-100
              hover:bg-gray-200
              active:bg-gray-300
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            Redakto
          </button>
        </div>
      )}
      <div>
          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>

    {showDeleteModal && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-red-600">
            Konfirmo fshirjen e llogarisë
          </h2>

          <p className="text-sm text-gray-600 mt-2">
            Ky veprim do të çaktivizojë llogarinë tuaj.
            Ju lutem shkruani fjalëkalimin për ta konfirmuar.
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

  );
}


