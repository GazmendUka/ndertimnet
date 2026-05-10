// frontend/src/pages/company/OfferEdit.jsx

import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
  Sparkles,
} from "lucide-react";

const STEPS = [
  { key: 1, title: "Prezantimi" },
  { key: 2, title: "Koha & Afati" },
  { key: 3, title: "Çmimi" },
  { key: 4, title: "Përfshihet / Nuk përfshihet" },
  { key: 5, title: "Nënshkrimi" },
];

function formatTime(date) {
  if (!date) return "";
  return date.toLocaleTimeString("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OfferEdit() {
  const { jobId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = Number(searchParams.get("step") || 1);

  const navigate = useNavigate();
  const { user, access } = useAuth();

  const profileStep =
    user?.company?.profile_step ??
    user?.company_profile?.profile_step ??
    access?.company?.profile_step ??
    access?.data?.company?.profile_step ??
    0;

  const canSign = profileStep >= 2;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [signedSuccess, setSignedSuccess] = useState(false);
  const saveStatusTimeoutRef = useRef(null);

  const [offer, setOffer] = useState(null);

  // Step 1
  const [presentation, setPresentation] = useState("");

  // Step 2
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 3
  const [priceType, setPriceType] = useState("fixed");
  const [priceAmount, setPriceAmount] = useState("");

  // Step 4
  const [includesText, setIncludesText] = useState("");
  const [excludesText, setExcludesText] = useState("");

  // Step 5
  const [confirm, setConfirm] = useState(false);
  const [personalNumber, setPersonalNumber] = useState("");

  const currentVersion = offer?.current_version;

  useEffect(() => {
    return () => {
      clearTimeout(saveStatusTimeoutRef.current);
    };
  }, []);

  const progressPercent = useMemo(() => {
    const idx = Math.min(Math.max(step, 1), 5);
    return Math.round(((idx - 1) / 4) * 100);
  }, [step]);

  function goStep(nextStep) {
    setSearchParams({ step: String(nextStep) });
  }

  const isStep1Valid = useMemo(() => {
    return presentation && presentation.trim().length > 5;
  }, [presentation]);

  const isStep2Valid = useMemo(() => {
    return !!startDate && !!endDate;
  }, [startDate, endDate]);

  function isStep3Valid(priceTypeValue, priceAmountValue) {
    return (
      !!priceTypeValue &&
      priceAmountValue !== "" &&
      !isNaN(priceAmountValue) &&
      Number(priceAmountValue) > 0
    );
  }

  function isStep4Valid(includesValue, excludesValue) {
    return includesValue.trim().length > 5 && excludesValue.trim().length > 5;
  }

  function canEnterStep(stepKey) {
    if (offer?.status === "signed" || offer?.status === "accepted") {
      return stepKey === 5;
    }

    if (stepKey === 1) return true;
    if (stepKey === 2) return isStep1Valid;
    if (stepKey === 3) return isStep1Valid && isStep2Valid;
    if (stepKey === 4)
      return isStep1Valid && isStep2Valid && isStep3Valid(priceType, priceAmount);
    if (stepKey === 5)
      return (
        isStep1Valid &&
        isStep2Valid &&
        isStep3Valid(priceType, priceAmount) &&
        isStep4Valid(includesText, excludesText)
      );

    return false;
  }

  function getStepHint() {
    if (step === 1 && !isStep1Valid) {
      return "Shkruani një prezantim të shkurtër, minimumi 6 karaktere.";
    }

    if (step === 2 && !isStep2Valid) {
      return "Zgjidhni datën e fillimit dhe datën e përfundimit.";
    }

    if (step === 3 && !isStep3Valid(priceType, priceAmount)) {
      return "Zgjidhni llojin e çmimit dhe vendosni një shumë më të madhe se 0.";
    }

    if (step === 4 && !isStep4Valid(includesText, excludesText)) {
      return "Plotësoni çfarë përfshihet dhe çfarë nuk përfshihet në ofertë.";
    }

    if (step === 5 && !confirm) {
      return "Konfirmoni që të dhënat janë të sakta para nënshkrimit.";
    }

    return "";
  }

  function SaveStatusBadge() {
    if (saveStatus === "saving") {
      return (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Loader2 size={14} className="animate-spin" />
          Duke ruajtur...
        </div>
      );
    }

    if (saveStatus === "saved") {
      return (
        <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <CheckCircle2 size={14} />
          Ruajtur {lastSavedAt ? `kl. ${formatTime(lastSavedAt)}` : ""}
        </div>
      );
    }

    if (saveStatus === "error") {
      return (
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          <AlertCircle size={14} />
          Gabim gjatë ruajtjes
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600">
        <Save size={14} />
        Draft
      </div>
    );
  }

  // ------------------------------
  // LOAD OR CREATE OFFER
  // ------------------------------
  useEffect(() => {
    if (!access) return;

    async function hydrateFromOffer(data) {
      setOffer(data);

      const cv = data?.current_version;

      setPresentation(cv?.presentation_text || "");
      setStartDate(cv?.can_start_from || "");
      setPriceType(cv?.price_type || "fixed");
      setPriceAmount(cv?.price_amount || "");
      setIncludesText(cv?.includes_text || "");
      setExcludesText(cv?.excludes_text || "");

      const dt = (cv?.duration_text || "").trim();
      const match = dt.match(/(\d{4}-\d{2}-\d{2})/);
      setEndDate(match ? match[1] : "");
    }

    async function loadOrCreate() {
      try {
        setLoading(true);

        try {
          const res = await api.get(`offers/by-job/${jobId}/`);
          await hydrateFromOffer(res.data);
          return;
        } catch (err) {
          const status = err?.response?.status;

          if (status !== 404) {
            throw err;
          }
        }

        const created = await api.post("offers/", {
          job_request: Number(jobId),
        });

        await hydrateFromOffer(created.data);

        toast.success("Oferta u krijua. Vazhdoni me hapat ✅");
      } catch (err) {
        console.error(err?.response?.data || err);

        const detail =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Nuk mund të ngarkohet/krijohet oferta.";

        toast.error(detail);
        setOffer(null);
      } finally {
        setLoading(false);
      }
    }

    loadOrCreate();
  }, [jobId, access]);

  // ------------------------------
  // SAVE PATCH
  // ------------------------------
  async function savePatch(payload, successMessage = "Ndryshimet u ruajtën.") {
    if (!offer?.id) return null;

    try {
      setSaving(true);
      setSaveStatus("saving");

      const res = await api.patch(`offers/${offer.id}/`, payload);

      setOffer(res.data);
      setLastSavedAt(new Date());
      setSaveStatus("saved");

      clearTimeout(saveStatusTimeoutRef.current);

      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2500);


      toast.success(successMessage);

      return res.data;
    } catch (err) {
      console.error(err?.response?.data || err);
      setSaveStatus("error");
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Nuk mund të ruhet."
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------
  // STEP ACTIONS
  // ------------------------------
  async function handleNextStep1() {
    if (!isStep1Valid) {
      toast.error("Shkruani një prezantim të vlefshëm (min 6 karaktere).");
      return;
    }

    await savePatch(
      { presentation_text: presentation },
      "Prezantimi u ruajt ✅"
    );

    try {
      await api.patch("accounts/profile/company/", {
        default_offer_presentation: presentation,
      });
    } catch (e) {
      console.warn("Could not save default_offer_presentation", e);
    }

    goStep(2);
  }

  async function handleNextStep2() {
    if (!isStep2Valid) {
      toast.error("Zgjidhni të dy datat.");
      return;
    }

    await savePatch(
      {
        can_start_from: startDate,
        duration_text: `Deri më ${endDate}`,
      },
      "Afati u ruajt ✅"
    );

    goStep(3);
  }

  async function handleNextStep3() {
    if (!priceType) {
      toast.error("Zgjidhni llojin e çmimit.");
      return;
    }

    if (!priceAmount || Number(priceAmount) <= 0) {
      toast.error("Vendosni një çmim të vlefshëm.");
      return;
    }

    await savePatch(
      {
        price_type: priceType,
        price_amount: priceAmount,
        currency: "EUR",
      },
      "Çmimi u ruajt ✅"
    );

    goStep(4);
  }

  async function handleNextStep4() {
    if (!isStep4Valid(includesText, excludesText)) {
      toast.error("Plotësoni të dy fushat.");
      return;
    }

    await savePatch(
      {
        includes_text: includesText,
        excludes_text: excludesText,
      },
      "Përmbajtja e ofertës u ruajt ✅"
    );

    goStep(5);
  }

  async function handleSign() {
    if (!confirm) {
      toast.error("Duhet të konfirmoni para nënshkrimit.");
      return;
    }

    if (!personalNumber.trim()) {
      toast.error("Shkruani numrin personal.");
      return;
    }

    try {
      setSaving(true);
      setSaveStatus("saving");

      const res = await api.post(`offers/${offer.id}/sign/`, {
        personal_number: personalNumber,
      });

      if (res?.data) {
        setOffer(res.data);
      }

      setSaveStatus("saved");

      clearTimeout(saveStatusTimeoutRef.current);

      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2500);
      setLastSavedAt(new Date());
      setSignedSuccess(true);

      toast.success("Oferta u nënshkrua dhe u dërgua me sukses ✅");
    } catch (err) {
      console.error(err.response?.data || err);

      setSaveStatus("error");

      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Nuk mund të nënshkruhet oferta."
      );
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    try {
      const res = await api.get(`offers/${offer.id}/pdf/`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `oferta_${offer.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("PDF u shkarkua ✅");
    } catch (err) {
      console.error(err);
      toast.error("PDF nuk mund të shkarkohet.");
    }
  }

  // ------------------------------
  // GUARDS
  // ------------------------------
  if (loading) {
    return (
      <div className="premium-container">
        <div className="premium-section p-10 flex items-center gap-3">
          <Loader2 className="animate-spin" size={22} />
          <span>Po ngarkohet oferta...</span>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="premium-container">
        <div className="premium-section p-10">
          <h1 className="page-title mb-2">Oferta nuk u gjet</h1>
          <p className="text-dim mb-5">
            Nuk mundëm ta ngarkojmë ose krijojmë këtë ofertë.
          </p>
          <button
            onClick={() => navigate(`/company/jobrequests/${jobId}`)}
            className="premium-btn btn-dark"
          >
            Kthehu te kërkesa
          </button>
        </div>
      </div>
    );
  }

  if (signedSuccess) {
    return (
      <div className="premium-container">
        <section className="premium-section p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 size={34} />
          </div>

          <p className="text-label mb-2">Oferta u dërgua</p>

          <h1 className="page-title mb-3">
            Oferta u nënshkrua me sukses
          </h1>

          <p className="text-dim max-w-xl mx-auto mb-8">
            Klienti tani mund ta shohë ofertën tuaj. Nëse klienti e pranon,
            chati hapet automatikisht dhe ju mund të vazhdoni komunikimin.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => navigate("/company/leads/mine")}
              className="premium-btn btn-dark"
            >
              Shko te ofertat e mia
            </button>

            <button
              onClick={() => navigate(`/company/jobrequests/${jobId}`)}
              className="premium-btn btn-light"
            >
              Kthehu te kërkesa
            </button>

            <button onClick={downloadPdf} className="premium-btn btn-light">
              Shkarko PDF
            </button>
          </div>
        </section>
      </div>
    );
  }

  const stepHint = getStepHint();

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <div className="premium-container">
      {/* TOP NAV */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/company/jobrequests/${jobId}`)}
          className="premium-btn btn-light inline-flex items-center gap-2 w-fit"
          disabled={saving}
        >
          <ArrowLeft size={18} />
          Kthehu te kërkesa
        </button>

        <div className="flex items-center gap-3">
          <SaveStatusBadge />

          <div className="text-sm text-gray-500">
            Statusi:{" "}
            <span className="font-semibold uppercase text-gray-800">
              {offer.status}
            </span>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <section className="premium-section mb-4">
        <p className="text-label mb-1">Wizard – Oferta</p>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div>
            <h1 className="page-title">Redakto ofertën</h1>
            <p className="text-dim">
              Plotëso hapat. Çdo pjesë ruhet gjatë procesit.
            </p>
          </div>

          <div className="min-w-[220px]">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progres</span>
              <span>{progressPercent}%</span>
            </div>

            <div className="h-2 rounded bg-gray-200 overflow-hidden">
              <div
                className="h-2 bg-gray-900 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {stepHint && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{stepHint}</span>
          </div>
        )}
      </section>

      {/* BODY */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT - STEPS */}
        <div className="lg:col-span-1">
          <div className="premium-card p-4">
            <p className="text-sm font-semibold mb-3">Hapat</p>

            <div className="space-y-2">
              {STEPS.map((s) => {
                const active = s.key === step;
                const done = s.key < step;
                const allowed = canEnterStep(s.key);

                return (
                  <button
                    key={s.key}
                    disabled={!allowed || saving}
                    onClick={() => allowed && goStep(s.key)}
                    className={`w-full text-left rounded-xl px-3 py-3 border flex items-center justify-between transition
                      ${!allowed ? "opacity-40 cursor-not-allowed" : ""}
                      ${
                        active
                          ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                          : "border-gray-200 hover:bg-gray-50"
                      }
                    `}
                  >
                    <span className="text-sm font-medium">
                      {s.key}. {s.title}
                    </span>

                    {done && (
                      <CheckCircle2
                        size={16}
                        className={active ? "text-white" : "text-green-600"}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Version:{" "}
              <span className="font-semibold text-gray-800">
                v{currentVersion?.version_number || 1}
              </span>
            </div>
          </div>

          <div className="premium-card p-5 bg-gray-900 text-white mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={17} />
              <h3 className="font-semibold text-sm">Këshillë</h3>
            </div>

            <p className="text-gray-300 text-sm">
              Një ofertë e qartë dhe profesionale rrit mundësinë që klienti ta
              pranojë. Shkruani saktë çfarë përfshihet dhe çfarë nuk përfshihet.
            </p>
          </div>
        </div>

        {/* RIGHT - STEP CONTENT */}
        <div className="lg:col-span-2">
          <div className="premium-section">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="premium-card p-6 space-y-4">
                <h2 className="text-lg font-semibold">
                  Hapi 1 – Prezantimi i kompanisë
                </h2>

                <p className="text-dim">
                  Ky tekst do të përdoret në ofertë dhe ruhet për përdorim të
                  ardhshëm.
                </p>

                <textarea
                  rows={7}
                  value={presentation}
                  onChange={(e) => setPresentation(e.target.value)}
                  className="w-full border rounded-lg p-4"
                  placeholder="Prezantoni shkurt kompaninë tuaj..."
                  disabled={saving}
                />

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => navigate(`/company/jobrequests/${jobId}`)}
                    className="premium-btn btn-light"
                    disabled={saving}
                  >
                    Mbyll
                  </button>

                  <button
                    onClick={handleNextStep1}
                    className="premium-btn btn-dark inline-flex items-center gap-2"
                    disabled={saving || !isStep1Valid}
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? "Duke ruajtur..." : "Ruaj dhe vazhdo"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="premium-card p-6 space-y-4">
                <h2 className="text-lg font-semibold">
                  Hapi 2 – Afati i punës
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Data e fillimit
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border rounded-lg p-3"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Data e përfundimit
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border rounded-lg p-3"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-3">
                  <button
                    onClick={() => goStep(1)}
                    className="premium-btn btn-light"
                    disabled={saving}
                  >
                    Mbrapa
                  </button>

                  <button
                    onClick={handleNextStep2}
                    className="premium-btn btn-dark inline-flex items-center gap-2"
                    disabled={saving || !isStep2Valid}
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? "Duke ruajtur..." : "Ruaj dhe vazhdo"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="premium-card p-6 space-y-5">
                <h2 className="text-lg font-semibold">Hapi 3 – Çmimi</h2>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="priceType"
                      value="fixed"
                      checked={priceType === "fixed"}
                      onChange={() => setPriceType("fixed")}
                      disabled={saving}
                    />
                    Çmim fiks
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="priceType"
                      value="hourly"
                      checked={priceType === "hourly"}
                      onChange={() => setPriceType("hourly")}
                      disabled={saving}
                    />
                    Çmim për orë
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Shuma (€)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    className="w-full border rounded-lg p-3"
                    placeholder="p.sh. 1200"
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Valuta aktualisht është EUR.
                  </p>
                </div>

                <div className="flex justify-between gap-3 pt-2">
                  <button
                    onClick={() => goStep(2)}
                    className="premium-btn btn-light"
                    disabled={saving}
                  >
                    Mbrapa
                  </button>

                  <button
                    onClick={handleNextStep3}
                    className="premium-btn btn-dark inline-flex items-center gap-2"
                    disabled={saving || !isStep3Valid(priceType, priceAmount)}
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? "Duke ruajtur..." : "Ruaj dhe vazhdo"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="premium-card p-6 space-y-5">
                <h2 className="text-lg font-semibold">
                  Hapi 4 – Çfarë përfshihet
                </h2>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Përfshihet
                  </label>
                  <textarea
                    rows={5}
                    value={includesText}
                    onChange={(e) => setIncludesText(e.target.value)}
                    className="w-full border rounded-lg p-3"
                    placeholder="Çfarë përfshihet në çmim..."
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Nuk përfshihet
                  </label>
                  <textarea
                    rows={5}
                    value={excludesText}
                    onChange={(e) => setExcludesText(e.target.value)}
                    className="w-full border rounded-lg p-3"
                    placeholder="Çfarë nuk përfshihet..."
                    disabled={saving}
                  />
                </div>

                <div className="flex justify-between gap-3">
                  <button
                    onClick={() => goStep(3)}
                    className="premium-btn btn-light"
                    disabled={saving}
                  >
                    Mbrapa
                  </button>

                  <button
                    onClick={handleNextStep4}
                    className="premium-btn btn-dark inline-flex items-center gap-2"
                    disabled={saving || !isStep4Valid(includesText, excludesText)}
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? "Duke ruajtur..." : "Ruaj dhe vazhdo"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5 */}
            {step === 5 && (
              <div className="premium-card p-6 space-y-6">
                <h2 className="text-lg font-semibold">
                  Hapi 5 – Nënshkrimi
                </h2>

                {!canSign && (
                  <div className="border border-yellow-300 bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800">
                    Për të nënshkruar ofertën, profili i kompanisë duhet të
                    jetë i plotësuar.
                    <br />
                    <button
                      onClick={() => navigate("/company/profile")}
                      className="underline font-semibold mt-2"
                    >
                      Plotëso profilin tani
                    </button>
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div>
                    <b>Prezantimi:</b>
                    <p className="text-gray-600 whitespace-pre-line">
                      {presentation || "-"}
                    </p>
                  </div>

                  <div>
                    <b>Afati:</b>
                    <p className="text-gray-600">
                      {startDate || "-"} → {endDate || "-"}
                    </p>
                  </div>

                  <div>
                    <b>Çmimi:</b>
                    <p className="text-gray-600">
                      {priceType === "fixed"
                        ? `Çmim fiks: ${priceAmount || "-"} €`
                        : `Çmim për orë: ${priceAmount || "-"} €/h`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <b>Përfshihet:</b>
                      <p className="text-gray-600 whitespace-pre-line">
                        {includesText || currentVersion?.includes_text || "-"}
                      </p>
                    </div>

                    <div>
                      <b>Nuk përfshihet:</b>
                      <p className="text-gray-600 whitespace-pre-line">
                        {excludesText || currentVersion?.excludes_text || "-"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={downloadPdf}
                    className="premium-btn btn-light"
                    disabled={saving}
                  >
                    📄 Shkarko kontratën (PDF)
                  </button>
                </div>

                <div className="bg-gray-50 border rounded-lg p-4">
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={confirm}
                      onChange={(e) => setConfirm(e.target.checked)}
                      disabled={saving}
                    />
                    <span>
                      Unë konfirmoj që të gjitha të dhënat janë të sakta dhe kjo
                      ofertë është juridikisht e detyrueshme.
                    </span>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">
                    Numri personal
                  </label>
                  <input
                    type="text"
                    value={personalNumber}
                    onChange={(e) => setPersonalNumber(e.target.value)}
                    className="w-full border rounded-lg p-3"
                    placeholder="1234567890123"
                    disabled={saving}
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => goStep(4)}
                    className="premium-btn btn-light"
                    disabled={saving}
                  >
                    Mbrapa
                  </button>

                  <button
                    onClick={handleSign}
                    disabled={!confirm || saving || !canSign}
                    className="premium-btn btn-dark inline-flex items-center gap-2"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? "Duke nënshkruar..." : "Nënshkruaj dhe dërgo ofertën"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}