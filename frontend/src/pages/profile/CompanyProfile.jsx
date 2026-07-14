import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Upload,
  Wrench,
} from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

const STEPS = [
  { id: 1, key: "basic", title: "Informacioni bazë", short: "Bazë", icon: Building2 },
  { id: 2, key: "professions", title: "Specialitetet", short: "Specialitetet", icon: Wrench },
  { id: 3, key: "service_areas", title: "Zona e shërbimit", short: "Zonat", icon: MapPin },
  { id: 4, key: "description", title: "Përshkrimi", short: "Përshkrimi", icon: FileText },
  { id: 5, key: "offer_text", title: "Teksti i ofertës", short: "Oferta", icon: Sparkles },
  { id: 6, key: "verification", title: "Verifikimi", short: "Verifikimi", icon: ShieldCheck },
];

const INDUSTRY_SHORT_LABELS = {
  "ndertim-dhe-renovim": "Ndërtim",
  "pastrim-dhe-mirembajtje": "Pastrim",
  "shperngulje-dhe-transport": "Transport",
  "kopsht-dhe-ambient-i-jashtem": "Kopsht",
  "siguri-dhe-bravari": "Siguri",
  "sherbime-prone-dhe-mirembajtje": "Servis",
};

const getIndustryLabel = (industry) =>
  INDUSTRY_SHORT_LABELS[industry?.slug] || industry?.name || "Të tjera";

const createForm = (company) => ({
  company_name: company?.company_name || "",
  org_number: company?.org_number || "",
  phone: company?.phone || "",
  website: company?.website || "",
  address: company?.address || "",
  description: company?.description || "",
  default_offer_presentation: company?.default_offer_presentation || "",
  professions: (company?.professions_detail || []).map((item) => item.id),
  cities: (company?.cities_detail || []).map((item) => item.id),
});

const getApiErrorMessage = (error, fallback) => {
  const response = error.response?.data;
  const details = response?.message ?? response;

  if (typeof details === "string" && details.trim()) return details;
  if (details && typeof details === "object") {
    const value = Object.values(details)
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .find((item) => typeof item === "string" && item.trim());
    if (value) return value;
  }

  return fallback;
};

export default function CompanyProfile() {
  const { access, logout, user } = useAuth();
  const navigate = useNavigate();
  const logoInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(createForm(null));
  const [professions, setProfessions] = useState([]);
  const [cities, setCities] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState("XK");
  const [selectedIndustryId, setSelectedIndustryId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirtySteps, setDirtySteps] = useState(() => new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!access) return;
    let active = true;

    async function loadProfile() {
      setLoading(true);
      try {
        const [companyResponse, professionResponse, cityResponse] = await Promise.all([
          api.get("/accounts/profile/company/"),
          api.get("/taxonomy/professions/"),
          api.get("/locations/cities/"),
        ]);
        if (!active) return;

        const companyData = companyResponse.data?.data || companyResponse.data;
        const professionData = professionResponse.data?.results || professionResponse.data || [];
        const cityData = cityResponse.data?.results || cityResponse.data || [];
        setCompany(companyData);
        setForm(createForm(companyData));
        setProfessions(professionData);
        setCities(cityData);

        const firstIncomplete = STEPS.find((step) => !companyData.profile_sections?.[step.key]);
        setCurrentStep(firstIncomplete?.id || 1);
        setShowSummary(!firstIncomplete);
      } catch (requestError) {
        setError(
          requestError.response?.status === 403 && !user?.email_verified
            ? "Verifikoni email-in para se të përditësoni profilin."
            : "Profili i kompanisë nuk mund të ngarkohet."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => { active = false; };
  }, [access, user?.email_verified]);

  useEffect(() => {
    const hasUnsavedChanges = dirtySteps.size > 0;
    const warnBeforeLeaving = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirtySteps]);

  const logoPreview = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : company?.logo_url || ""),
    [company?.logo_url, logoFile]
  );

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const selectedProfessions = useMemo(
    () => professions.filter((item) => form.professions.includes(item.id)),
    [form.professions, professions]
  );
  const selectedCities = useMemo(
    () => cities.filter((item) => form.cities.includes(item.id)),
    [cities, form.cities]
  );
  const filteredCities = useMemo(
    () => cities.filter((item) => String(item.country).toUpperCase() === selectedCountry),
    [cities, selectedCountry]
  );
  const industries = useMemo(() => {
    const result = new Map();
    professions.forEach((profession) => {
      const industry = profession.industry_detail || { id: "other", name: "Të tjera" };
      if (!result.has(industry.id)) result.set(industry.id, industry);
    });
    return [...result.values()];
  }, [professions]);
  const filteredProfessions = useMemo(
    () => professions.filter((item) => String(item.industry_detail?.id || "other") === String(selectedIndustryId)),
    [professions, selectedIndustryId]
  );

  useEffect(() => {
    if (!selectedIndustryId && industries.length) {
      const selectedIndustry = selectedProfessions[0]?.industry_detail?.id;
      setSelectedIndustryId(selectedIndustry || industries[0].id);
    }
  }, [industries, selectedIndustryId, selectedProfessions]);

  const sectionStatus = useMemo(() => ({
    basic: Boolean(
      form.company_name.trim()
      && form.org_number.trim()
      && form.phone.trim()
      && form.address.trim()
      && company?.email_verified
    ),
    professions: form.professions.length > 0,
    service_areas: form.cities.length > 0 || Boolean(company?.city?.id),
    description: form.description.trim().length >= 20,
    offer_text: form.default_offer_presentation.trim().length >= 10,
    verification: Boolean(company?.registration_document),
  }), [company?.city?.id, company?.email_verified, company?.registration_document, form]);

  const completedCount = Object.values(sectionStatus).filter(Boolean).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);
  const allComplete = completedCount === STEPS.length;
  const isLocked = !user?.email_verified;

  const markDirty = (step = currentStep) => {
    setDirtySteps((current) => new Set([...current, step]));
    setMessage("");
    setError("");
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    markDirty();
  };

  const toggleListValue = (field, id) => {
    setForm((current) => {
      const values = current[field];
      return {
        ...current,
        [field]: values.includes(id) ? values.filter((value) => value !== id) : [...values, id],
      };
    });
    markDirty();
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!form.company_name.trim() || !form.org_number.trim() || !form.phone.trim() || !form.address.trim()) {
        return "Plotësoni emrin, numrin e biznesit, telefonin dhe adresën.";
      }
    }
    if (step === 2 && !form.professions.length) return "Zgjidhni të paktën një specialitet.";
    if (step === 3 && !form.cities.length && !company?.city?.id) return "Zgjidhni të paktën një qytet.";
    if (step === 4 && form.description.trim().length < 20) return "Përshkrimi duhet të ketë të paktën 20 karaktere.";
    if (step === 5 && form.default_offer_presentation.trim().length < 10) return "Teksti i ofertës duhet të ketë të paktën 10 karaktere.";
    if (step === 6 && !company?.registration_document && !documentFile) return "Zgjidhni dokumentin e regjistrimit.";
    return "";
  };

  const buildStepPayload = (step) => {
    const payload = new FormData();
    if (step === 1) {
      const website = form.website.trim() && !/^https?:\/\//i.test(form.website.trim())
        ? `https://${form.website.trim()}`
        : form.website.trim();
      payload.append("company_name", form.company_name.trim());
      payload.append("org_number", form.org_number.trim());
      payload.append("phone", form.phone.trim());
      payload.append("website", website);
      payload.append("address", form.address.trim());
      if (logoFile) payload.append("logo", logoFile);
    }
    if (step === 2) form.professions.forEach((id) => payload.append("professions", id));
    if (step === 3) form.cities.forEach((id) => payload.append("cities", id));
    if (step === 4) payload.append("description", form.description.trim());
    if (step === 5) payload.append("default_offer_presentation", form.default_offer_presentation.trim());
    if (step === 6 && documentFile) payload.append("registration_document", documentFile);
    return payload;
  };

  const saveStep = async ({ advance = true } = {}) => {
    if (isLocked || saving) return;
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (currentStep === 6 && company?.registration_document && !documentFile) {
      setShowSummary(allComplete);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await api.patch("/accounts/profile/company/", buildStepPayload(currentStep));
      const updated = response.data?.data || response.data;
      setCompany(updated);
      if (currentStep === 1 && form.website && !/^https?:\/\//i.test(form.website)) {
        setForm((current) => ({ ...current, website: `https://${current.website}` }));
      }
      setLogoFile(null);
      setDocumentFile(null);
      if (documentInputRef.current) documentInputRef.current.value = "";
      setDirtySteps((current) => {
        const next = new Set(current);
        next.delete(currentStep);
        return next;
      });
      setMessage("Hapi u ruajt me sukses.");

      const updatedComplete = STEPS.every(
        (step) => updated.profile_sections?.[step.key] ?? sectionStatus[step.key]
      );
      if (currentStep === 6 && updatedComplete) {
        setShowSummary(true);
      } else if (advance && currentStep < STEPS.length) {
        setCurrentStep((step) => step + 1);
      }
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Ndryshimet nuk mund të ruhen. Provoni përsëri."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!deletePassword) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.post("/accounts/delete/", { password: deletePassword });
      logout();
      navigate("/");
    } catch (requestError) {
      setDeleteError(requestError.response?.data?.message || "Fjalëkalimi është i pasaktë.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="premium-container py-8">
        <div className="premium-card flex items-center gap-3 p-8 text-gray-500">
          <Loader2 className="animate-spin" size={20} /> Duke ngarkuar profilin…
        </div>
      </div>
    );
  }

  if (!company) {
    return <div className="premium-container py-8"><div className="premium-card p-8 text-red-700">{error}</div></div>;
  }

  return (
    <div className="premium-container py-6 md:py-8">
      <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-label">Profili i kompanisë</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Plotësoni profilin tuaj</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Ndiqni gjashtë hapa të qartë. Mund të kaloni në çdo seksion dhe të vazhdoni më vonë.
          </p>
        </div>
        <div className="min-w-[220px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Progresi i profilit</span>
            <strong>{progress}%</strong>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gray-900 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">{completedCount} nga {STEPS.length} hapa të përfunduar</p>
        </div>
      </header>

      {isLocked && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Verifikoni adresën tuaj të email-it për të ruajtur ndryshimet në profil.
        </div>
      )}

      <nav className="mb-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm" aria-label="Hapat e profilit">
        <div className="flex min-w-max gap-1 lg:grid lg:min-w-0 lg:grid-cols-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const active = currentStep === step.id && !showSummary;
            const complete = sectionStatus[step.key];
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => { setCurrentStep(step.id); setShowSummary(false); setError(""); setMessage(""); }}
                className={`flex min-w-[145px] items-center gap-3 rounded-xl px-3 py-3 text-left transition lg:min-w-0 ${
                  active ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  active ? "bg-white/15" : complete ? "bg-emerald-100 text-emerald-700" : "bg-gray-100"
                }`}>
                  {complete ? <Check size={15} /> : <Icon size={15} />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[10px] uppercase tracking-wide ${active ? "text-gray-300" : "text-gray-400"}`}>Hapi {step.id}</span>
                  <span className="block truncate text-xs font-semibold">{step.short}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {showSummary ? (
        <CompletionSummary company={company} steps={STEPS} sectionStatus={sectionStatus} onEdit={(step) => { setCurrentStep(step); setShowSummary(false); }} />
      ) : (
        <section className="premium-card overflow-hidden">
          <StepHeader step={STEPS[currentStep - 1]} />
          <div className="p-5 sm:p-7 lg:p-8">
            {currentStep === 1 && (
              <BasicStep
                company={company}
                form={form}
                logoPreview={logoPreview}
                logoFile={logoFile}
                inputRef={logoInputRef}
                onChange={updateField}
                onLogo={(file) => { setLogoFile(file); markDirty(1); }}
              />
            )}
            {currentStep === 2 && (
              <ProfessionStep
                industries={industries}
                selectedIndustryId={selectedIndustryId}
                setSelectedIndustryId={setSelectedIndustryId}
                selected={selectedProfessions}
                professions={filteredProfessions}
                selectedIds={form.professions}
                toggle={(id) => toggleListValue("professions", id)}
              />
            )}
            {currentStep === 3 && (
              <CityStep
                country={selectedCountry}
                setCountry={setSelectedCountry}
                selected={selectedCities}
                cities={filteredCities}
                selectedIds={form.cities}
                toggle={(id) => toggleListValue("cities", id)}
              />
            )}
            {currentStep === 4 && <DescriptionStep form={form} onChange={updateField} />}
            {currentStep === 5 && <OfferTextStep form={form} onChange={updateField} companyName={form.company_name} />}
            {currentStep === 6 && (
              <VerificationStep
                company={company}
                file={documentFile}
                inputRef={documentInputRef}
                onFile={(selected) => { setDocumentFile(selected); markDirty(6); }}
              />
            )}

            {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
            {message && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div>}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
                disabled={currentStep === 1 || saving}
                className="premium-btn btn-light inline-flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <ArrowLeft size={16} /> Kthehu
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {dirtySteps.has(currentStep) && (
                  <button type="button" onClick={() => saveStep({ advance: false })} disabled={saving || isLocked} className="premium-btn btn-light disabled:opacity-40">
                    Ruaj
                  </button>
                )}
                <button type="button" onClick={() => saveStep({ advance: true })} disabled={saving || isLocked} className="premium-btn btn-dark inline-flex items-center justify-center gap-2 disabled:opacity-40">
                  {saving ? <><Loader2 className="animate-spin" size={16} /> Duke ruajtur…</> : currentStep === 6 ? <><CheckCircle2 size={16} /> Përfundo profilin</> : <>Ruaj dhe vazhdo <ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-red-100 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Menaxhimi i llogarisë</h2>
            <p className="mt-1 text-xs text-gray-500">Çaktivizimi i llogarisë është një veprim i rëndësishëm.</p>
          </div>
          <button type="button" onClick={() => setShowDeleteModal(true)} className="text-sm font-semibold text-red-600 hover:text-red-700">Fshi llogarinë</button>
        </div>
      </section>

      {showDeleteModal && (
        <DeleteAccountModal
          password={deletePassword}
          setPassword={setDeletePassword}
          error={deleteError}
          deleting={deleting}
          onDelete={deleteAccount}
          onClose={() => { setShowDeleteModal(false); setDeletePassword(""); setDeleteError(""); }}
        />
      )}
    </div>
  );
}

function StepHeader({ step }) {
  const Icon = step.icon;
  const descriptions = {
    1: "Plotësoni të dhënat kryesore të kompanisë. Këto informacione ndihmojnë klientët t'ju njohin dhe t'ju kontaktojnë.",
    2: "Zgjidhni profesionet dhe shërbimet që ofroni. Kjo na ndihmon t'ju dërgojmë kërkesa relevante.",
    3: "Zgjidhni qytetet ku kompania juaj ofron shërbime. Mund të zgjidhni disa zona.",
    4: "Prezantoni kompaninë, përvojën dhe mënyrën tuaj të punës për të krijuar besim.",
    5: "Krijoni një prezantim standard që vendoset automatikisht në ofertat e ardhshme.",
    6: "Ngarkoni dokumentin që vërteton regjistrimin e kompanisë. Dokumenti nuk shfaqet për klientët.",
  };
  return (
    <div className="border-b border-gray-100 bg-gray-50 px-5 py-5 sm:px-7 lg:px-8">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white"><Icon size={20} /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Hapi {step.id} nga 6</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">{step.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{descriptions[step.id]}</p>
        </div>
      </div>
    </div>
  );
}

function BasicStep({ company, form, logoPreview, logoFile, inputRef, onChange, onLogo }) {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 p-5 sm:flex-row sm:items-center">
        <button type="button" onClick={() => inputRef.current?.click()} className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-500">
          {logoPreview ? <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" /> : <ImagePlus className="text-gray-400" size={28} />}
        </button>
        <div>
          <h3 className="font-semibold text-gray-900">Logoja e kompanisë</h3>
          <p className="mt-1 text-sm text-gray-500">PNG, JPG ose WebP. Rekomandohet një imazh katror.</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 text-sm font-semibold text-gray-900 hover:underline">{logoPreview ? "Ndrysho logon" : "Shto logon"}</button>
          {logoFile && <p className="mt-1 text-xs text-gray-500">Zgjedhur: {logoFile.name}</p>}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => onLogo(event.target.files?.[0] || null)} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Emri i kompanisë *" name="company_name" value={form.company_name} onChange={onChange} />
        <Input label="Numri i biznesit (ORG) *" name="org_number" value={form.org_number} onChange={onChange} />
        <Input label="Email-i i llogarisë" value={company.account_email || ""} readOnly hint={company.email_verified ? "Email i verifikuar" : "Email ende i paverifikuar"} />
        <Input label="Numri i telefonit *" name="phone" value={form.phone} onChange={onChange} />
        <Input label="Faqja e internetit" name="website" value={form.website} onChange={onChange} placeholder="https://kompania.com" />
        <Input label="Adresa e plotë *" name="address" value={form.address} onChange={onChange} placeholder="Rruga, numri, qyteti" />
      </div>
    </div>
  );
}

function ProfessionStep({ industries, selectedIndustryId, setSelectedIndustryId, selected, professions, selectedIds, toggle }) {
  return (
    <ChoiceStep selected={selected} empty="Nuk keni zgjedhur ende specialitete." onRemove={(item) => toggle(item.id)}>
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex min-w-max gap-1 rounded-xl bg-gray-100 p-1">
          {industries.map((industry) => (
            <button key={industry.id} type="button" onClick={() => setSelectedIndustryId(industry.id)} className={`rounded-lg px-4 py-2 text-sm font-medium ${String(selectedIndustryId) === String(industry.id) ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              {getIndustryLabel(industry)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {professions.map((profession) => <ChoiceButton key={profession.id} selected={selectedIds.includes(profession.id)} onClick={() => toggle(profession.id)}>{profession.name}</ChoiceButton>)}
      </div>
    </ChoiceStep>
  );
}

function CityStep({ country, setCountry, selected, cities, selectedIds, toggle }) {
  return (
    <ChoiceStep selected={selected} empty="Nuk keni zgjedhur ende qytete." onRemove={(item) => toggle(item.id)}>
      <div className="inline-flex rounded-xl bg-gray-100 p-1">
        {[{ code: "XK", name: "Kosovë" }, { code: "AL", name: "Shqipëri" }].map((item) => (
          <button key={item.code} type="button" onClick={() => setCountry(item.code)} className={`rounded-lg px-5 py-2 text-sm font-medium ${country === item.code ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{item.name}</button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {cities.map((city) => <ChoiceButton key={city.id} selected={selectedIds.includes(city.id)} onClick={() => toggle(city.id)}>{city.name}</ChoiceButton>)}
      </div>
    </ChoiceStep>
  );
}

function ChoiceStep({ selected, empty, onRemove, children }) {
  return (
    <div>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Të zgjedhura ({selected.length})</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.length ? selected.map((item) => <button key={item.id} type="button" onClick={() => onRemove(item)} className="rounded-full bg-gray-900 px-3 py-1.5 text-sm font-medium text-white">{item.name} <span className="ml-1 text-white/60">×</span></button>) : <p className="text-sm text-gray-500">{empty}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ChoiceButton({ selected, onClick, children }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${selected ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"}`}>{children}</button>;
}

function DescriptionStep({ form, onChange }) {
  const length = form.description.length;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <label>
        <span className="text-sm font-semibold text-gray-800">Përshkrimi i kompanisë *</span>
        <textarea name="description" value={form.description} onChange={onChange} rows={10} maxLength={2000} placeholder="Tregoni për përvojën, ekipin, mënyrën e punës dhe llojet e projekteve që realizoni…" className="premium-input mt-2 resize-y" />
        <span className={`mt-2 block text-right text-xs ${length >= 20 ? "text-emerald-600" : "text-gray-400"}`}>{length}/2000 · minimumi 20</span>
      </label>
      <HelpCard title="Çfarë të përfshini?" items={["Përvojën dhe historikun", "Shërbimet kryesore", "Mënyrën e punës", "Çfarë ju dallon"]} />
    </div>
  );
}

function OfferTextStep({ form, onChange, companyName }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <label>
        <span className="text-sm font-semibold text-gray-800">Teksti standard i ofertës *</span>
        <textarea name="default_offer_presentation" value={form.default_offer_presentation} onChange={onChange} rows={10} maxLength={1500} placeholder="Përshëndetje! Faleminderit për kërkesën tuaj…" className="premium-input mt-2 resize-y" />
        <span className={`mt-2 block text-right text-xs ${form.default_offer_presentation.trim().length >= 10 ? "text-emerald-600" : "text-gray-400"}`}>{form.default_offer_presentation.length}/1500 · minimumi 10</span>
      </label>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Parapamja në ofertë</p>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="font-semibold text-gray-900">{companyName || "Kompania juaj"}</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">{form.default_offer_presentation || "Teksti juaj standard do të shfaqet këtu."}</p>
        </div>
        <p className="mt-3 text-xs leading-5 text-gray-500">Ky tekst vendoset automatikisht, por mund të ndryshohet në çdo ofertë.</p>
      </div>
    </div>
  );
}

function VerificationStep({ company, file, inputRef, onFile }) {
  const hasDocument = Boolean(company.registration_document);
  return (
    <div className="mx-auto max-w-2xl">
      {hasDocument ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <FileCheck2 className="mx-auto text-emerald-700" size={36} />
          <h3 className="mt-3 font-semibold text-emerald-900">Dokumenti është ngarkuar</h3>
          <p className="mt-2 text-sm text-emerald-700">Dokumenti ruhet në mënyrë private dhe përdoret vetëm për verifikimin e kompanisë.</p>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center hover:border-gray-500 hover:bg-gray-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"><Upload size={22} /></span>
          <span className="mt-4 font-semibold text-gray-900">Zgjidh dokumentin e regjistrimit</span>
          <span className="mt-2 text-sm text-gray-500">PDF, JPG ose PNG · maksimumi 5 MB</span>
          {file && <span className="mt-4 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">{file.name}</span>}
        </button>
      )}
      {!hasDocument && <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(event) => onFile(event.target.files?.[0] || null)} />}
      <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        Dokumenti nuk shfaqet në profil dhe nuk ndahet me klientët. Administratorët e përdorin vetëm për të konfirmuar kompaninë.
      </div>
    </div>
  );
}

function CompletionSummary({ company, steps, sectionStatus, onEdit }) {
  return (
    <section className="premium-card overflow-hidden">
      <div className="bg-gray-900 px-6 py-8 text-center text-white sm:px-10 sm:py-10">
        <CheckCircle2 className="mx-auto text-emerald-400" size={44} />
        <h2 className="mt-4 text-2xl font-bold">Profili juaj është i plotë</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-300">Informacionet janë ruajtur. Mund të ktheheni në çdo hap për t'i përditësuar.</p>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button key={step.id} type="button" onClick={() => onEdit(step.id)} className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left hover:border-gray-400 hover:shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">{sectionStatus[step.key] ? <Check size={17} /> : <Icon size={17} />}</span>
              <span><span className="block text-xs text-gray-400">Hapi {step.id}</span><span className="block text-sm font-semibold text-gray-900">{step.title}</span></span>
            </button>
          );
        })}
      </div>
      <div className="border-t border-gray-100 px-6 py-4 text-center text-sm text-gray-500">{company.company_name}</div>
    </section>
  );
}

function Input({ label, hint, readOnly = false, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <input {...props} readOnly={readOnly} className={`premium-input mt-2 ${readOnly ? "cursor-not-allowed bg-gray-50 text-gray-500" : ""}`} />
      {hint && <span className="mt-1.5 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function HelpCard({ title, items }) {
  return (
    <aside className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
      <h3 className="font-semibold text-blue-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-blue-800">
        {items.map((item) => <li key={item} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0" /> {item}</li>)}
      </ul>
    </aside>
  );
}

function DeleteAccountModal({ password, setPassword, error, deleting, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-red-600">Konfirmo fshirjen e llogarisë</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">Shkruani fjalëkalimin për ta çaktivizuar llogarinë.</p>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Fjalëkalimi" className="premium-input mt-4" />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="premium-btn btn-light">Anulo</button>
          <button type="button" onClick={onDelete} disabled={deleting || !password} className="premium-btn bg-red-600 text-white disabled:opacity-40">{deleting ? "Duke fshirë…" : "Fshi llogarinë"}</button>
        </div>
      </div>
    </div>
  );
}
