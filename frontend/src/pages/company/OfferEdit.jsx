// frontend/src/pages/company/OfferEdit.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const STEPS = [
  { key: 1, title: "Prezantimi" },
  { key: 2, title: "Koha & Afati" },
  { key: 3, title: "Çmimi" },
  { key: 4, title: "Përfshihet / Nuk përfshihet" },
  { key: 5, title: "Nënshkrimi" },
];

export default function OfferEdit() {
  const { jobId } = useParams(); // job_request id
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

  const [offer, setOffer] = useState(null);

  // Steg 1
  const [presentation, setPresentation] = useState("");

  // Steg 2 (NY: två datum)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // STEP 3 – PRICE
  const [priceType, setPriceType] = useState("fixed");
  const [priceAmount, setPriceAmount] = useState("");

  // STEP 4
  const [includesText, setIncludesText] = useState("");
  const [excludesText, setExcludesText] = useState("");

  // STEP 5 - SIGN
  const [confirm, setConfirm] = useState(false);
  const [personalNumber, setPersonalNumber] = useState("");

  const currentVersion = offer?.current_version;

  const progressPercent = useMemo(() => {
    const idx = Math.min(Math.max(step, 1), 5);
    return Math.round(((idx - 1) / 5) * 100);
  }, [step]);

  // ------------------------------
  // HELPERS
  // ------------------------------
  function goStep(nextStep) {
    setSearchParams({ step: String(nextStep) });
  }

  const isStep1Valid = useMemo(() => {
    return presentation && presentation.trim().length > 5;
  }, [presentation]);

  const isStep2Valid = useMemo(() => {
    return !!startDate && !!endDate;
  }, [startDate, endDate]);



  function isStep3Valid(priceType, priceAmount) {
    return (
      !!priceType &&
      priceAmount !== "" &&
      !isNaN(priceAmount) &&
      Number(priceAmount) > 0
    );
  }

  function isStep4Valid(includesText, excludesText) {
    return (
      includesText.trim().length > 5 &&
      excludesText.trim().length > 5
    );
  }

  function canEnterStep(stepKey) {

    // 🔒 Om signerad → lås allt utom steg 5
    if (offer?.status === "signed" || offer?.status === "accepted") {
      return stepKey === 5;
    }

    if (stepKey === 1) return true;

    if (stepKey === 2)
      return isStep1Valid;

    if (stepKey === 3)
      return isStep1Valid && isStep2Valid;

    if (stepKey === 4)
      return (
        isStep1Valid &&
        isStep2Valid &&
        isStep3Valid(priceType, priceAmount)
      );

    if (stepKey === 5)
      return (
        isStep1Valid &&
        isStep2Valid &&
        isStep3Valid(priceType, priceAmount) &&
        isStep4Valid(includesText, excludesText)
      );

    return false;
  }

  // ------------------------------
  // LOAD OFFER
  // ------------------------------
  useEffect(() => {
    if (!access) return;

    async function load() {
      try {
        setLoading(true);
        const res = await api.get(`offers/by-job/${jobId}/`);

        const data = res.data;

        setOffer(data);

        const cv = data?.current_version;

        // Steg 1
        setPresentation(cv?.presentation_text || "");

        // Steg 2
        setStartDate(cv?.can_start_from || "");

        // Steg 3
        setPriceType(cv?.price_type || "fixed");
        setPriceAmount(cv?.price_amount || "");

        // Steg 4
        setIncludesText(cv?.includes_text || "");
        setExcludesText(cv?.excludes_text || "");



        // Om du redan sparar sluttid i duration_text som "Deri më YYYY-MM-DD"
        // så försök plocka ut datumet:
        const dt = (cv?.duration_text || "").trim();
        const match = dt.match(/(\d{4}-\d{2}-\d{2})/);
        setEndDate(match ? match[1] : "");

      } catch (err) {
        console.error(err);
        toast.error("Nuk mund të ngarkohet oferta.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [jobId, access]);


  // ------------------------------
  // SAVE PATCH
  // ------------------------------
  async function savePatch(payload) {
    if (!offer?.id) return;

    try {
      setSaving(true);
      const res = await api.patch(`offers/${offer.id}/`, payload);
      setOffer(res.data);
      return res.data;
    } catch (err) {
      console.error(err);
      toast.error("Nuk mund të ruhet.");
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

    await savePatch({ presentation_text: presentation });

    // Spara som default på company (best effort)
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

    await savePatch({
      can_start_from: startDate,
      duration_text: `Deri më ${endDate}`,
    });

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

    await savePatch({
        price_type: priceType,
        price_amount: priceAmount,
        currency: "EUR",
    });

    goStep(4);
    }

    async function handleNextStep4() {
      if (!isStep4Valid(includesText, excludesText)) {
        toast.error("Plotësoni të dy fushat.");
        return;
      }

      await savePatch({
        includes_text: includesText,
        excludes_text: excludesText,
      });

      goStep(5);
    }

    async function handleSign() {
      // 🔒 FRONTEND-GUARD (VIKTIGAST)
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

        await api.post(`offers/${offer.id}/sign/`, {
          personal_number: personalNumber,
        });

        toast.success("Oferta u nënshkrua me sukses!");

        navigate("/leads/mine");

      } catch (err) {
        console.error(err.response?.data || err);

        toast.error(
          err.response?.data?.detail ||
          err.response?.data?.message ||
          "Nuk mund të nënshkruhet oferta."
        );
      } finally {
        setSaving(false);
      }
    }


    // ------------------------------
    // PDF DOWNLOAD
    // ------------------------------
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

      } catch (err) {
        console.error(err);
        toast.error("PDF nuk mund të shkarkohet.");
      }
    }

  // ------------------------------
  // GUARDS
  // ------------------------------
  if (loading) {
    return <div className="p-10">🔄 Po ngarkohet oferta...</div>;
  }

  if (!offer) {
    return <div className="p-10">Oferta nuk u gjet.</div>;
  }

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <div className="premium-container">
      {/* TOP NAV */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(`/offers/${offer?.id}`)}
          className="premium-btn btn-light inline-flex items-center gap-2"
          disabled={saving || !offer?.id}
        >
          <ArrowLeft size={18} />
          Kthehu te oferta
        </button>
        <div className="text-sm text-gray-500">
          Statusi:{" "}
          <span className="font-semibold uppercase text-gray-800">
            {offer.status}
          </span>
        </div>
      </div>

      {/* HEADER */}
      <section className="premium-section mb-4">
        <p className="text-label mb-1">Wizard – Oferta</p>
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div>
            <h1 className="page-title">Redakto ofertën</h1>
            <p className="text-dim">
              Plotëso hapat. Draft ruhet gjatë procesit.
            </p>
          </div>

          {/* Progress */}
          <div className="min-w-[220px]">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progres</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 rounded bg-gray-200 overflow-hidden">
              <div
                className="h-2 bg-gray-900"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
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
                    disabled={!allowed}
                    onClick={() => allowed && goStep(s.key)}
                    className={`w-full text-left rounded-xl px-3 py-2 border flex items-center justify-between
                      ${!allowed ? "opacity-40 cursor-not-allowed" : ""}
                      ${active ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:bg-gray-50"}
                    `}
                  >
                    <span className="text-sm font-medium">
                      {s.key}. {s.title}
                    </span>

                    {done && (
                      <CheckCircle2 size={16} className="text-green-600" />
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
            <h3 className="font-semibold text-sm mb-1">Info</h3>
            <p className="text-gray-300 text-sm">
              Pas pranimit nga klienti, chati hapet falas. Nëse dëshironi chat
              më herët, mund të zhbllokohet me 5€.
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
                  Ky tekst do të përdoret në ofertë dhe ruhet për përdorim të ardhshëm.
                </p>

                <textarea
                  rows={7}
                  value={presentation}
                  onChange={(e) => setPresentation(e.target.value)}
                  className="w-full border rounded-lg p-4"
                  placeholder="Prezantoni shkurt kompaninë tuaj..."
                />

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => navigate(`/offers/${offer.id}`)}
                    className="premium-btn btn-light"
                    disabled={saving || !offer?.id}
                  >
                    Mbyll
                  </button>


                  <button
                    onClick={handleNextStep1}
                    className="premium-btn btn-dark"
                    disabled={saving || !isStep1Valid}
                    title={!isStep1Valid ? "Plotësoni prezantimin (min 6 karaktere)" : ""}
                  >
                    {saving ? "Duke ruajtur..." : "Vazhdo"}
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
                    className="premium-btn btn-dark"
                    disabled={saving || !isStep2Valid}
                    title={!isStep2Valid ? "Zgjidhni start dhe slut" : ""}
                  >
                    {saving ? "Duke ruajtur..." : "Vazhdo"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
            <div className="premium-card p-6 space-y-5">
                <h2 className="text-lg font-semibold">
                Hapi 3 – Çmimi
                </h2>

                <div className="space-y-3">
                <label className="flex items-center gap-2">
                    <input
                    type="radio"
                    name="priceType"
                    value="fixed"
                    checked={priceType === "fixed"}
                    onChange={() => setPriceType("fixed")}
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
                    className="premium-btn btn-dark"
                    disabled={saving || !isStep3Valid(priceType, priceAmount)}
                >
                    {saving ? "Duke ruajtur..." : "Vazhdo"}
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
                    className="premium-btn btn-dark"
                    disabled={
                      saving ||
                      !isStep4Valid(includesText, excludesText)
                    }
                  >
                    {saving ? "Duke ruajtur..." : "Vazhdo"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5 – SIGN */}
            {step === 5 && (
              <div className="premium-card p-6 space-y-6">

                <h2 className="text-lg font-semibold">
                  Hapi 5 – Nënshkrimi
                </h2>
                
                {/* 🔒 PROFILE NOT COMPLETE INFO */}
                {!canSign && (
                  <div className="border border-yellow-300 bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800">
                    Për të nënshkruar ofertën, profili i kompanisë duhet të jetë i plotësuar.
                    <br />
                    <button
                      onClick={() => navigate("/company/profile")}
                      className="underline font-semibold mt-2"
                    >
                      Plotëso profilin tani
                    </button>
                  </div>
                )}

                {/* SUMMARY */}
                <div className="space-y-3 text-sm">

                  <div>
                    <b>Prezantimi:</b>
                    <p className="text-gray-600 whitespace-pre-line">
                      {presentation}
                    </p>
                  </div>

                  <div>
                    <b>Afati:</b>
                    <p className="text-gray-600">
                      {startDate} → {endDate}
                    </p>
                  </div>

                  <div>
                    <b>Çmimi:</b>
                    <p className="text-gray-600">
                      {priceType === "fixed"
                        ? `Çmim fiks: ${priceAmount} €`
                        : `Çmim për orë: ${priceAmount} €/h`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <b>Përfshihet:</b>
                      <p className="text-gray-600 whitespace-pre-line">
                        {currentVersion?.includes_text || "-"}
                      </p>
                    </div>

                    <div>
                      <b>Nuk përfshihet:</b>
                      <p className="text-gray-600 whitespace-pre-line">
                        {currentVersion?.excludes_text || "-"}
                      </p>
                    </div>
                  </div>


                  <button
                    onClick={downloadPdf}
                    className="premium-btn btn-light">
                    📄 Shkarko kontratën (PDF)
                  </button>

                </div>

                {/* CONFIRMATION */}
                <div className="bg-gray-50 border rounded-lg p-4">
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={confirm}
                      onChange={(e) => setConfirm(e.target.checked)}
                    />
                    <span>
                      Unë konfirmoj që të gjitha të dhënat janë të sakta dhe kjo ofertë
                      është juridikisht e detyrueshme.
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
                  />
                </div>

                {/* ACTIONS */}
                <div className="flex justify-between">
                  <button
                    onClick={() => goStep(4)}
                    className="premium-btn btn-light"
                  >
                    Mbrapa
                  </button>

                  <button
                    onClick={handleSign}
                    disabled={!confirm || saving || !canSign}
                    className="premium-btn btn-dark"
                  >
                    {saving ? "Duke nënshkruar..." : "Nënshkruaj ofertën"}
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
