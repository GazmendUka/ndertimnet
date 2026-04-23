// src/pages/jobrequests/JobRequestCreate.jsx
// Full Version V2:
// Premium multi-step drafts + toast + autosave +
// Step 1 = Contact/Profile autofill + profile sync
// ------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, FileEdit, X, RefreshCw } from "lucide-react";
import jobRequestDraftService from "../../services/jobRequestDraftService";
import customerConsentService from "../../services/customerConsentService";
import { useAuth } from "../../auth/AuthContext";
import { isEmailNotVerifiedError } from "../../utils/emailVerification";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import SearchableSelect from "../../components/ui/SearchableSelect";

export default function JobRequestCreate() {
  const navigate = useNavigate();
  const { isEmailVerified } = useAuth();

  const [cities, setCities] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [country, setCountry] = useState("XK"); // default Kosovo

  // ------------------------------------------------------------
  // Backend draft
  // ------------------------------------------------------------
  const [draft, setDraft] = useState(null);

  // ------------------------------------------------------------
  // Contact/Profile data (NEW STEP 1)
  // ------------------------------------------------------------
  const [contactData, setContactData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    email_verified: false,
    phone: "",
  });

  // ------------------------------------------------------------
  // Form data (JobRequest draft)
  // ------------------------------------------------------------
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    city: null,
    profession: null,
    budget: "",
  });

  const [currentStep, setCurrentStep] = useState(1);

  // ------------------------------------------------------------
  // UI state
  // ------------------------------------------------------------
  const [loading, setLoading] = useState(true); // initial load
  const [saving, setSaving] = useState(false); // draft autosave
  const [savingProfile, setSavingProfile] = useState(false); // profile step save
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [consentData, setConsentData] = useState({
    personal_number: "",
    consent_publish: false,
    consent_identity: false,
  });

  // Autosave indicator
  const [saveStatus, setSaveStatus] = useState("idle");
  // idle | saving | saved | error

  // Toast: unfinished draft
  const [draftToast, setDraftToast] = useState({
    show: false,
    existingDraft: null,
  });

  // ------------------------------------------------------------
  // Slide+Fade animation
  // ------------------------------------------------------------
  const [animPhase, setAnimPhase] = useState("in"); // in | out
  const [navDir, setNavDir] = useState("next"); // next | back
  const animTimerRef = useRef(null);

  const animateToStep = (direction, nextStep) => {
    setNavDir(direction);
    setAnimPhase("out");

    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setCurrentStep(nextStep);
      setAnimPhase("in");
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  const stepAnimClass = useMemo(() => {
    const base = "jr-anim";
    const phase = animPhase === "in" ? "jr-in" : "jr-out";
    const dir = navDir === "next" ? "jr-next" : "jr-back";
    return `${base} ${phase} ${dir}`;
  }, [animPhase, navDir]);

  const selectedCity = cities.find((c) => c.id === formData.city);
  const selectedProfession = professions.find(
    (p) => p.id === formData.profession
  );

  // ------------------------------------------------------------
  // Validation helpers
  // ------------------------------------------------------------
  const isValidPhone = (value) => {
    const cleaned = (value || "").replace(/\s+/g, "");
    return cleaned.length >= 6;
  };

  const isValidPersonalNumber = (value, selectedCountry) => {
    if (!value) return false;

    const cleaned = value.replace(/\s/g, "").toUpperCase();

    if (selectedCountry === "XK") {
      return /^\d{13}$/.test(cleaned);
    }

    if (selectedCountry === "AL") {
      return /^[A-Z]\d{9}$/.test(cleaned);
    }

    return false;
  };

  const isStep1Valid =
    contactData.first_name.trim().length >= 2 &&
    contactData.last_name.trim().length >= 2 &&
    Boolean(contactData.email?.trim()) &&
    isValidPhone(contactData.phone);

  const isStep2Valid = formData.title.trim().length >= 5;
  const isStep3Valid = formData.description.trim().length >= 20;
  const isStep4Valid = Boolean(formData.city && formData.profession);
  const isStep6Valid =
    isValidPersonalNumber(consentData.personal_number, country) &&
    consentData.consent_publish === true &&
    consentData.consent_identity === true;

  // ------------------------------------------------------------
  // Step errors
  // ------------------------------------------------------------
  const stepErrors = useMemo(() => {
    const errs = {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      title: "",
      description: "",
    };

    if (currentStep === 1) {
      if (!contactData.first_name.trim()) {
        errs.first_name = "Emri është i detyrueshëm.";
      } else if (contactData.first_name.trim().length < 2) {
        errs.first_name = "Emri duhet të ketë së paku 2 karaktere.";
      }

      if (!contactData.last_name.trim()) {
        errs.last_name = "Mbiemri është i detyrueshëm.";
      } else if (contactData.last_name.trim().length < 2) {
        errs.last_name = "Mbiemri duhet të ketë së paku 2 karaktere.";
      }

      if (!contactData.email.trim()) {
        errs.email = "Email-i mungon në llogarinë tuaj.";
      }

      if (!contactData.phone.trim()) {
        errs.phone = "Numri i telefonit është i detyrueshëm.";
      } else if (!isValidPhone(contactData.phone)) {
        errs.phone = "Numri i telefonit nuk duket i saktë.";
      }
    }

    if (currentStep === 2) {
      const t = formData.title.trim();

      if (!t) errs.title = "Titulli është i detyrueshëm.";
      else if (t.length < 5) {
        errs.title = "Titulli duhet të ketë së paku 5 karaktere.";
      }
    }

    if (currentStep === 3) {
      const d = formData.description.trim();

      if (!d) errs.description = "Përshkrimi është i detyrueshëm.";
      else if (d.length < 20) {
        errs.description = "Përshkrimi duhet të ketë së paku 20 karaktere.";
      }
    }

    return errs;
  }, [currentStep, contactData, formData]);

  // ------------------------------------------------------------
  // Initial load: profile + lookups + drafts
  // ------------------------------------------------------------
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("accounts/profile/customer/");
        const profile = res.data?.data || {};

        setContactData({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          email_verified: Boolean(profile.email_verified),
          phone: profile.phone || "",
        });
      } catch (err) {
        console.error("Profile load failed:", err);
        setError("Profili i klientit nuk mund të ngarkohet.");
      } finally {
        setProfileLoading(false);
      }
    };

    const loadLookups = async () => {
      try {
        const [cityRes, professionRes] = await Promise.all([
          api.get("/locations/cities/"),
          api.get("/taxonomy/professions/"),
        ]);

        setCities(cityRes.data.results ?? cityRes.data ?? []);
        setProfessions(professionRes.data.results ?? professionRes.data ?? []);
      } catch (err) {
        console.error("Lookup load failed:", err);
        setError("Nuk mund të ngarkohen qytetet ose profesionet.");
      } finally {
        setLookupsLoading(false);
      }
    };

    const initDrafts = async () => {
      try {
        const drafts = await jobRequestDraftService.getMyDrafts();
        const openDrafts = (drafts || []).filter((d) => !d.is_submitted);

        if (openDrafts.length > 0) {
          openDrafts.sort(
            (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
          );
          setDraftToast({ show: true, existingDraft: openDrafts[0] });
        } else {
          const created = await jobRequestDraftService.createDraft();
          hydrateFromDraft(created);
        }
      } catch (err) {
        console.error("Init draft failed:", err);
        setError("Nuk mund të ngarkohet drafti. Ju lutem provoni përsëri.");
      }
    };

    const init = async () => {
      setLoading(true);
      setError("");

      await Promise.all([loadProfile(), loadLookups(), initDrafts()]);

      setLoading(false);
    };

    init();
  }, []);

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  const hydrateFromDraft = (d) => {
    setDraft(d);
    setCurrentStep(d.current_step || 1);
    setFormData({
      title: d.title || "",
      description: d.description || "",
      city: d.city ?? null,
      profession: d.profession ?? null,
      budget: d.budget ?? "",
    });
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateContactField = (field, value) => {
    setContactData((prev) => ({ ...prev, [field]: value }));
  };

  // ------------------------------------------------------------
  // Toast actions
  // ------------------------------------------------------------
  const handleContinueExisting = () => {
    if (draftToast.existingDraft) {
      hydrateFromDraft(draftToast.existingDraft);
    }

    setDraftToast({ show: false, existingDraft: null });
  };

  const handleStartNew = async () => {
    setDraftToast({ show: false, existingDraft: null });
    setLoading(true);
    setError("");

    try {
      const created = await jobRequestDraftService.createDraft();
      hydrateFromDraft(created);
    } catch (err) {
      console.error("Create new draft failed:", err);
      setError("Nuk mund të krijohet një draft i ri.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // Save profile step (NEW)
  // ------------------------------------------------------------
  const saveContactProfile = async () => {
    setSavingProfile(true);
    setError("");

    try {
      await api.patch("accounts/profile/customer/", {
        first_name: contactData.first_name.trim(),
        last_name: contactData.last_name.trim(),
        phone: contactData.phone.trim(),
      });

      return true;
    } catch (err) {
      console.error("Profile save failed:", err);
      setError(
        "Nuk mund të ruhen të dhënat e kontaktit. Ju lutem provoni përsëri."
      );
      return false;
    } finally {
      setSavingProfile(false);
    }
  };

  // ------------------------------------------------------------
  // Save draft step
  // ------------------------------------------------------------
  const saveStep = async (newStep = currentStep) => {
    if (!draft) return false;

    setSaving(true);
    setSaveStatus("saving");
    setError("");

    try {
      const payload = {
        ...formData,
        budget:
          formData.budget === "" || formData.budget === null
            ? null
            : Number(formData.budget),
        current_step: newStep,
      };

      const updated = await jobRequestDraftService.updateDraft(draft.id, payload);
      setDraft(updated);

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1300);

      return true;
    } catch (err) {
      console.error("Save step failed:", err);
      setError("Nuk mund të ruhet drafti. Ju lutem provoni përsëri.");
      setSaveStatus("error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Navigation actions
  // ------------------------------------------------------------
  const goNext = async () => {
    if (submitting || saving || savingProfile) return;

    const next = currentStep + 1;
    if (next > 6) return;

    // Step 1 = save profile first
    if (currentStep === 1) {
      if (!isStep1Valid) return;

      const profileOk = await saveContactProfile();
      if (!profileOk) return;

      const draftOk = await saveStep(next);
      if (!draftOk) return;

      animateToStep("next", next);
      return;
    }

    if (currentStep === 2 && !isStep2Valid) return;
    if (currentStep === 3 && !isStep3Valid) return;
    if (currentStep === 4 && !isStep4Valid) return;

    const ok = await saveStep(next);
    if (!ok) return;

    animateToStep("next", next);
  };

  const goBack = async () => {
    if (submitting || saving || savingProfile) return;

    const prev = currentStep - 1;
    if (prev < 1) return;

    const ok = await saveStep(prev);
    if (!ok) return;

    animateToStep("back", prev);
  };

  // ------------------------------------------------------------
  // FINAL SUBMIT – Step 6
  // ------------------------------------------------------------
  const submitConsentAndJob = async () => {
    if (!draft || !isStep6Valid || submitting) return;

    if (!isEmailVerified) {
      toast.error("Verifiera din email för att kunna publicera.");
      return;
    }

    // Safety: ensure contact/profile data is saved before final submit
    if (!isStep1Valid) {
      setError("Plotësoni të dhënat e kontaktit përpara publikimit.");
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const profileOk = await saveContactProfile();
      if (!profileOk) throw new Error("Profile save failed");

      await customerConsentService.submitConsent({
        personal_number: consentData.personal_number,
        country,
        consent: true,
      });

      const ok = await saveStep(6);
      if (!ok) throw new Error("Save failed");

      const job = await jobRequestDraftService.submitDraft(draft.id);
      navigate(`/customer/jobrequests/${job.id}`);
    } catch (err) {
      console.error("Final submit failed:", err);

      if (isEmailNotVerifiedError(err)) {
        toast.error("Verifikoni email-in tuaj për të publikuar.");
        return;
      }

      setError(
        "Çështja nuk mund të përfundojë. Ju lutemi kontrolloni detajet dhe provoni përsëri."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------
  // STEP 1 – Contact/Profile
  // ------------------------------------------------------------
  const Step1 = (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        <p className="font-medium mb-1">Të dhënat e kontaktit</p>
        <p>
          Këto të dhëna ruhen në profilin tuaj dhe përdoren për kërkesat që
          krijoni në platformë.
        </p>
      </div>

      <div>
        <label className="block mb-1 font-medium">Emri *</label>
        <input
          type="text"
          className={`premium-input ${
            stepErrors.first_name ? "jr-input-error" : ""
          }`}
          placeholder="Emri"
          value={contactData.first_name}
          onChange={(e) => updateContactField("first_name", e.target.value)}
          disabled={saving || savingProfile || submitting || profileLoading}
        />
        {stepErrors.first_name && (
          <p className="jr-help jr-help-error">{stepErrors.first_name}</p>
        )}
      </div>

      <div>
        <label className="block mb-1 font-medium">Mbiemri *</label>
        <input
          type="text"
          className={`premium-input ${
            stepErrors.last_name ? "jr-input-error" : ""
          }`}
          placeholder="Mbiemri"
          value={contactData.last_name}
          onChange={(e) => updateContactField("last_name", e.target.value)}
          disabled={saving || savingProfile || submitting || profileLoading}
        />
        {stepErrors.last_name && (
          <p className="jr-help jr-help-error">{stepErrors.last_name}</p>
        )}
      </div>

      <div>
        <label className="block mb-1 font-medium">Email-i</label>
        <input
          type="email"
          className={`premium-input bg-gray-50 ${
            stepErrors.email ? "jr-input-error" : ""
          }`}
          value={contactData.email}
          disabled
        />
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-600">Statusi i email-it:</span>
          {contactData.email_verified ? (
            <span className="text-green-600 font-medium">i verifikuar</span>
          ) : (
            <span className="text-red-600 font-medium">jo i verifikuar</span>
          )}
        </div>
        {stepErrors.email && (
          <p className="jr-help jr-help-error">{stepErrors.email}</p>
        )}
      </div>

      <div>
        <label className="block mb-1 font-medium">Numri i telefonit *</label>
        <input
          type="text"
          className={`premium-input ${
            stepErrors.phone ? "jr-input-error" : ""
          }`}
          placeholder="Numri i telefonit"
          value={contactData.phone}
          onChange={(e) => updateContactField("phone", e.target.value)}
          disabled={saving || savingProfile || submitting || profileLoading}
        />
        {stepErrors.phone && (
          <p className="jr-help jr-help-error">{stepErrors.phone}</p>
        )}
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={goNext}
          disabled={!isStep1Valid || saving || savingProfile || submitting}
          className="premium-btn btn-dark inline-flex items-center gap-2"
        >
          {(savingProfile || saving || saveStatus === "saving") && (
            <Loader2 size={16} className="animate-spin" />
          )}
          {savingProfile ? "Duke ruajtur profilin..." : "Vazhdo"}
        </button>
      </div>
    </div>
  );

  // ------------------------------------------------------------
  // STEP 2 – Title
  // ------------------------------------------------------------
  const Step2 = (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">Titulli i punës *</label>
        <input
          type="text"
          className={`premium-input ${
            stepErrors.title ? "jr-input-error" : ""
          }`}
          placeholder="P.sh. Ndërtim terase..."
          value={formData.title}
          onChange={(e) => updateField("title", e.target.value)}
          disabled={saving || submitting}
        />
        {stepErrors.title && (
          <p className="jr-help jr-help-error">{stepErrors.title}</p>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={saving || submitting}
          className="premium-btn btn-light inline-flex items-center gap-2"
        >
          Kthehu
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={!isStep2Valid || saving || submitting}
          className="premium-btn btn-dark inline-flex items-center gap-2"
        >
          {(saving || saveStatus === "saving") && (
            <Loader2 size={16} className="animate-spin" />
          )}
          {saving ? "Duke ruajtur..." : "Vazhdo"}
        </button>
      </div>
    </div>
  );

  // ------------------------------------------------------------
  // STEP 3 – Description
  // ------------------------------------------------------------
  const Step3 = (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">Përshkrimi i punës *</label>
        <textarea
          className={`premium-input h-32 ${
            stepErrors.description ? "jr-input-error" : ""
          }`}
          placeholder="Shkruani detajet e projektit..."
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          disabled={saving || submitting}
        />
        {stepErrors.description && (
          <p className="jr-help jr-help-error">{stepErrors.description}</p>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={saving || submitting}
          className="premium-btn btn-light inline-flex items-center gap-2"
        >
          Kthehu
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={!isStep3Valid || saving || submitting}
          className="premium-btn btn-dark inline-flex items-center gap-2"
        >
          {(saving || saveStatus === "saving") && (
            <Loader2 size={16} className="animate-spin" />
          )}
          {saving ? "Duke ruajtur..." : "Vazhdo"}
        </button>
      </div>
    </div>
  );

  // ------------------------------------------------------------
  // STEP 4 – Profession + City
  // ------------------------------------------------------------
  const Step4 = (
    <div className="space-y-4">
      {lookupsLoading && (
        <p className="text-sm text-gray-500">
          Duke ngarkuar qytetet dhe profesionet…
        </p>
      )}

      <div>
        <label className="block mb-1 font-medium">Profesioni *</label>
        <SearchableSelect
          options={professions}
          value={formData.profession}
          onChange={(val) => updateField("profession", val)}
          placeholder="Zgjidh profesionin"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Qyteti *</label>
        <SearchableSelect
          options={cities}
          value={formData.city}
          onChange={(val) => updateField("city", val)}
          placeholder="Zgjidh qytetin"
        />
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={saving || submitting}
          className="premium-btn btn-light"
        >
          Kthehu
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={lookupsLoading || !formData.city || !formData.profession}
          className="premium-btn btn-dark"
        >
          Vazhdo
        </button>
      </div>
    </div>
  );

  // ------------------------------------------------------------
  // STEP 5 – Budget + Summary
  // ------------------------------------------------------------
  const Step5 = (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">Buxheti (opsionale)</label>
        <input
          type="number"
          className="premium-input"
          placeholder="P.sh. 500"
          value={formData.budget}
          onChange={(e) => updateField("budget", e.target.value)}
          disabled={saving || submitting}
        />
      </div>

      <div className="p-4 rounded bg-gray-50 space-y-1">
        <h3 className="font-semibold mb-2">Përmbledhja</h3>

        <p>
          <strong>Emri:</strong> {contactData.first_name || "—"}{" "}
          {contactData.last_name || ""}
        </p>
        <p>
          <strong>Email-i:</strong> {contactData.email || "—"}
        </p>
        <p>
          <strong>Telefoni:</strong> {contactData.phone || "—"}
        </p>
        <p>
          <strong>Titulli:</strong> {formData.title || "—"}
        </p>
        <p>
          <strong>Përshkrimi:</strong> {formData.description || "—"}
        </p>
        <p>
          <strong>Profesioni:</strong> {selectedProfession?.name || "—"}
        </p>
        <p>
          <strong>Qyteti:</strong> {selectedCity?.name || "—"}
        </p>
        <p>
          <strong>Buxheti:</strong>{" "}
          {formData.budget ? `${formData.budget} €` : "Nuk është vendosur"}
        </p>
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={saving || submitting}
          className="premium-btn btn-light inline-flex items-center gap-2"
        >
          Kthehu
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={saving || submitting}
          className="premium-btn btn-dark inline-flex items-center gap-2"
        >
          Vazhdo
        </button>
      </div>
    </div>
  );

  // ------------------------------------------------------------
  // STEP 6 – Consent
  // ------------------------------------------------------------
  const Step6 = (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Pëlqimi & identiteti</h2>

      <div>
        <label className="block mb-1 font-medium">Shteti *</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="premium-input"
          disabled={saving || submitting}
        >
          <option value="XK">Kosovë</option>
          <option value="AL">Shqipëri</option>
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium">Numri personal *</label>
        <input
          type="text"
          placeholder={country === "XK" ? "DDMMYYYYRRRRC" : "A123456789"}
          value={consentData.personal_number}
          onChange={(e) =>
            setConsentData((prev) => ({
              ...prev,
              personal_number: e.target.value,
            }))
          }
          className="premium-input"
          disabled={saving || submitting}
        />
        <p className="text-sm text-gray-500 mt-1">
          Këto të dhëna përdoren vetëm për verifikimin e identitetit dhe nuk
          publikohen.
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={consentData.consent_publish}
            onChange={(e) =>
              setConsentData((prev) => ({
                ...prev,
                consent_publish: e.target.checked,
              }))
            }
            disabled={saving || submitting}
          />
          <span className="text-sm">
            Pajtohem që kërkesa ime të publikohet dhe të shpërndahet me kompani
            relevante.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={consentData.consent_identity}
            onChange={(e) =>
              setConsentData((prev) => ({
                ...prev,
                consent_identity: e.target.checked,
              }))
            }
            disabled={saving || submitting}
          />
          <span className="text-sm">
            Deklaroj se jam personi që i përket kjo kërkesë dhe se të dhënat janë
            të sakta.
          </span>
        </label>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">Pse kërkohet numri personal?</p>
        <p>
          Numri personal përdoret vetëm për të verifikuar identitetin tuaj dhe
          për të siguruar që kërkesa publikohet me pëlqimin e personit të saktë.
          Kjo ndihmon në parandalimin e abuzimeve dhe rrit besueshmërinë për
          kompanitë që do të kontaktojnë lidhur me kërkesën tuaj.
        </p>
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={saving || submitting}
          className="premium-btn btn-light inline-flex items-center gap-2"
        >
          Kthehu
        </button>

        <div className="flex flex-col items-end">
          <button
            type="button"
            onClick={submitConsentAndJob}
            disabled={!isStep6Valid || !isEmailVerified || submitting}
            className={`premium-btn btn-dark inline-flex items-center gap-2 ${
              !isStep6Valid || !isEmailVerified
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Përfundo & publiko
          </button>

          {!isEmailVerified && (
            <div className="mt-2 text-sm text-amber-700">
              ⚠️ Verifiera din email för att kunna publicera jobbet.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------
  // Step render
  // ------------------------------------------------------------
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return Step1;
      case 2:
        return Step2;
      case 3:
        return Step3;
      case 4:
        return Step4;
      case 5:
        return Step5;
      case 6:
        return Step6;
      default:
        return Step1;
    }
  };

  // ------------------------------------------------------------
  // Stepper
  // ------------------------------------------------------------
  const steps = [1, 2, 3, 4, 5, 6];

  const Stepper = (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;

          return (
            <React.Fragment key={step}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold jr-step-dot ${
                  isActive
                    ? "jr-step-active"
                    : isCompleted
                    ? "jr-step-done"
                    : "jr-step-idle"
                }`}
              >
                {step}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 rounded-full jr-step-line ${
                    step < currentStep ? "jr-line-done" : "jr-line-idle"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">Hapi {currentStep} nga 6</p>

        <div className="flex items-center justify-end" style={{ minWidth: 130 }}>
          {(saving || savingProfile) && (
            <span className="text-blue-600 text-sm flex items-center gap-1">
              <Loader2 size={14} className="animate-spin" /> Duke ruajtur…
            </span>
          )}

          {!saving && !savingProfile && saveStatus === "saved" && (
            <span className="text-green-600 text-sm flex items-center gap-1">
              ✓ Ruajtur
            </span>
          )}

          {!saving && !savingProfile && saveStatus === "error" && (
            <span className="text-red-600 text-sm">Gabim gjatë ruajtjes!</span>
          )}
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------
  // Loading UI
  // ------------------------------------------------------------
  if (loading && !draft && !draftToast.show) {
    return (
      <div className="premium-container">
        <div className="premium-card p-6 flex items-center gap-3">
          <Loader2 className="animate-spin" size={20} />
          <span>Duke ngarkuar formularin...</span>
        </div>

        <style>{INLINE_CSS}</style>
      </div>
    );
  }

  const showOnlyToast = draftToast.show && !draft;

  return (
    <div className="premium-container">
      <style>{INLINE_CSS}</style>

      <button
        onClick={() => navigate("/customer")}
        className="premium-btn btn-light mb-6 inline-flex items-center gap-2"
        disabled={submitting || saving || savingProfile}
      >
        <ArrowLeft size={18} />
        Kthehu te dashboard
      </button>

      <h1 className="page-title mb-2">Krijo kërkesë të re</h1>
      <p className="text-dim mb-6">
        Plotësoni detajet në disa hapa për të krijuar një projekt të ri.
      </p>

      {error && (
        <div className="premium-card p-3 mb-4 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {!showOnlyToast && draft && (
        <div className="premium-card p-6 space-y-4">
          {Stepper}
          <div className={stepAnimClass}>{renderStep()}</div>
        </div>
      )}

      {draftToast.show && draftToast.existingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="premium-card w-full max-w-md p-6 shadow-2xl border border-gray-200 bg-white relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() =>
                setDraftToast({ show: false, existingDraft: null })
              }
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                <FileEdit size={24} className="text-blue-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Keni një draft të papërfunduar
                </h3>

                <p className="text-sm text-gray-600 mb-4">
                  Duket që keni filluar një kërkesë më herët. Dëshironi ta
                  vazhdoni apo të filloni nga e para?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleContinueExisting}
                    className="premium-btn btn-dark flex items-center gap-2"
                    disabled={loading}
                  >
                    <FileEdit size={16} />
                    Vazhdoni draftin
                  </button>

                  <button
                    onClick={handleStartNew}
                    className="premium-btn btn-light flex items-center gap-2"
                    disabled={loading}
                  >
                    <RefreshCw size={16} />
                    Fillo nga e para
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOnlyToast && (
        <div className="premium-card p-6">
          <div className="flex items-center gap-3 text-gray-700">
            <Loader2 className="animate-spin" size={18} />
            <span>Ju lutem zgjidhni një opsion për draftin…</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Inline CSS
// ------------------------------------------------------------
const INLINE_CSS = `
/* Smooth stepper transitions */
.jr-step-dot { transition: all 200ms ease; }
.jr-step-line { transition: all 200ms ease; }
.jr-step-active { background: #2563eb; color: #fff; box-shadow: 0 6px 16px rgba(37,99,235,.25); }
.jr-step-done { background: #22c55e; color: #fff; }
.jr-step-idle { background: #d1d5db; color: #374151; }
.jr-line-done { background: #2563eb; }
.jr-line-idle { background: #e5e7eb; }

/* Inline validation */
.jr-help { margin-top: 6px; font-size: 0.875rem; }
.jr-help-error { color: #b91c1c; }
.jr-input-error { border: 1px solid #ef4444 !important; }

/* Slide + Fade animation container */
.jr-anim { will-change: transform, opacity; }
.jr-in, .jr-out { transition: opacity 220ms ease, transform 220ms ease; }
.jr-out.jr-next { opacity: 0; transform: translateX(-16px); }
.jr-out.jr-back { opacity: 0; transform: translateX(16px); }
.jr-in.jr-next { opacity: 1; transform: translateX(0); }
.jr-in.jr-back { opacity: 1; transform: translateX(0); }

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fadeIn {
  animation: fadeIn 180ms ease-out;
}
`;