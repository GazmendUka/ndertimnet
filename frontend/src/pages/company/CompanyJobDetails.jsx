// ===========================================
// src/pages/jobrequests/CompanyJobDetails.jsx
// FINAL CLEAN VERSION – OFFERS + PAYMENT UNLOCK
// ===========================================

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import StatusBadge from "../../components/ui/StatusBadge";
import { toast } from "react-hot-toast";
import { openPaymentUrl } from "../../platform/mobile";
import paymentService from "../../services/paymentService";

import {
  ArrowLeft,
  MapPin,
  Euro,
  Tag,
  Briefcase,
  Clock,
  FileText,
  Lock,
  Unlock,
} from "lucide-react";

export default function CompanyJobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, isCompany, access } = useAuth();

  // ------------------------------
  // STATE
  // ------------------------------
  const [job, setJob] = useState(null);

  const [offerInfo, setOfferInfo] = useState({
    exists: null,
    id: null,
  });

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingOffer, setLoadingOffer] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState(null);
  const [error, setError] = useState("");

  // ------------------------------
  // LOAD JOB (SOURCE OF TRUTH)
  // ------------------------------
  const fetchJob = async () => {
    if (!access || !jobId) return;
    setLoadingJob(true);
    try {
      const res = await api.get(`jobrequests/${jobId}/`);
      setJob(res.data);
    } catch (err) {
      console.error(err);
      setError("Nuk mund të ngarkohet kërkesa.");
    } finally {
      setLoadingJob(false);
    }
  };

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, access]);

  // ------------------------------
  // CHECK IF OFFER EXISTS
  // ------------------------------
  const checkOffer = async () => {
    if (!access) return;

    setLoadingOffer(true);
    try {
      const res = await api.get(`offers/check-by-job/${jobId}/`);
      setOfferInfo({
        exists: res.data.exists,
        id: res.data.offer_id || null,
      });
    } catch (err) {
      console.error(err);
      setOfferInfo({ exists: false, id: null });
    } finally {
      setLoadingOffer(false);
    }
  };

  useEffect(() => {
    checkOffer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, access]);

  useEffect(() => {
    if (!access || !jobId) return undefined;
    if (new URLSearchParams(window.location.search).get("payment") !== "return") {
      return undefined;
    }

    let disposed = false;
    let timer;
    let attempt = 0;

    const checkPayment = async () => {
      attempt += 1;
      try {
        const response = await paymentService.getLeadUnlockStatus(jobId);
        if (disposed) return;
        const payment = response.data;

        if (payment.lead_unlocked || payment.status === "paid") {
          setPaymentFeedback({ type: "success", text: "Pagesa u konfirmua dhe lead-i u hap." });
          setJob((previous) => previous ? { ...previous, lead_unlocked: true } : previous);
          await checkOffer();
          return;
        }

        if (payment.status === "failed") {
          setPaymentFeedback({ type: "error", text: "Pagesa dështoi. Mund të provoni përsëri." });
          return;
        }

        if (payment.status === "canceled") {
          setPaymentFeedback({ type: "warning", text: "Pagesa u anulua. Asnjë tarifë nuk u konfirmua." });
          return;
        }

        setPaymentFeedback({ type: "pending", text: "Pagesa po verifikohet…" });
        if (attempt < 6) timer = window.setTimeout(checkPayment, 1500);
      } catch {
        if (!disposed) {
          setPaymentFeedback({ type: "error", text: "Statusi i pagesës nuk mund të verifikohej." });
        }
      }
    };

    checkPayment();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, jobId]);

  // ------------------------------
  // GUARDS
  // ------------------------------
  if (!user) return <div className="p-6">Duke ngarkuar...</div>;

  if (!isCompany)
    return (
      <div className="p-6 text-red-600 font-semibold">
        Akses i ndaluar. (Vetëm kompanitë)
      </div>
    );

  if (loadingJob) return <p className="text-center mt-10">🔄 Po ngarkohet...</p>;
  if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;
  if (!job) return <p className="text-center mt-10">Kërkesa nuk u gjet.</p>;

  // ------------------------------
  // LOCK RULE (EXTRA STRIKT)
  // ------------------------------
  const leadUnlocked = job.lead_unlocked === true;
  const isClosed = !job.is_active;
  const freeLeadsRemaining = Number(job.offers_left || 0);
  const unlockLeadPriceLabel = freeLeadsRemaining > 0 ? "Gratis" : "4,95 €";
  const unlockLeadHint =
    freeLeadsRemaining > 0
      ? `Ju keni ${freeLeadsRemaining} hapje falas të mbetura`
      : "Hapja e këtij lead-i kushton 4,95 €";

  const formatBudget = (b) => (b ? `${b} €` : "Pa buxhet");
  const formatDate = (d) => new Date(d).toLocaleDateString("sv-SE");

  // ------------------------------
  // HANDLERS
  // ------------------------------
  const handleCreateOffer = () => {
    navigate(`/company/jobrequests/${jobId}/offer/edit`);
  };
  
  const handleUnlockLead = async () => {
    try {
      setUnlocking(true);

      setPaymentFeedback(null);
      const res = await paymentService.unlockLead(jobId);

      if (res.data.requires_payment && res.data.payment_url) {
        toast.success("Po ju dërgojmë te pagesa...");
        await openPaymentUrl(
          res.data.payment_url,
          `/company/jobrequests/${jobId}?payment=return`
        );
        return;
      }

      toast.success(
        res.data.used_free_lead
          ? "Lead u hap falas!"
          : "Lead u hap me sukses!"
      );

      // 🔑 FORCE UI UPDATE
      setJob((prev) => ({
        ...prev,
        lead_unlocked: true,
        offers_left: res.data.free_leads_remaining,
      }));

      // Efter unlock: refresh offer-exists (så UI direkt blir korrekt)
      await checkOffer();
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === "store_billing_required") {
        const text = "Blerja e lead-it në aplikacion do të aktivizohet pasi pagesa e dyqanit të miratohet.";
        setPaymentFeedback({ type: "warning", text });
        toast.error(text);
      } else if (code === "payment_initializing") {
        setPaymentFeedback({ type: "pending", text: "Pagesa po përgatitet. Provoni përsëri pas pak." });
      } else {
        setPaymentFeedback({ type: "error", text: "Nuk u arrit të hapet lead. Provoni përsëri." });
        toast.error("Nuk u arrit të hapet lead.");
      }
    } finally {
      setUnlocking(false);
    }
  };

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <div className="premium-container">
      {/* TOP NAV */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate("/company/jobrequests")}
          className="premium-btn btn-light inline-flex items-center"
        >
          <ArrowLeft size={18} />
          Kthehu te lista
        </button>

        <button
          onClick={() => navigate("/company")}
          className="premium-btn btn-light inline-flex items-center"
        >
          🏠 Dashboard
        </button>
      </div>

      {/* HEADER */}
      <section className="premium-section mb-4">
        <p className="text-label mb-1">Detajet e punës</p>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div>
            <h1 className="page-title">{job.title}</h1>
            <p className="text-dim">Shikoni detajet dhe menaxhoni ofertën tuaj.</p>
          </div>

          <StatusBadge active={job.is_active} />
        </div>
      </section>

      {paymentFeedback && (
        <div
          role="status"
          className={`mb-4 rounded-xl border p-4 text-sm ${
            paymentFeedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : paymentFeedback.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {paymentFeedback.text}
        </div>
      )}

      {/* CONTENT */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-1">
          <div className="premium-card p-6 space-y-3 text-gray-700">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Briefcase size={18} />
              Informacioni i kërkesës
            </h2>

            <p>{job.description || "Nuk ka përshkrim."}</p>

            <p className="flex items-center gap-2">
              <MapPin size={16} />
              Lokacioni: {job.city_detail?.name || "—"}
            </p>

            <p className="flex items-center gap-2">
              <Euro size={16} />
              Buxheti: {formatBudget(job.budget)}
            </p>

            <p className="flex items-center gap-2">
              <Tag size={16} />
              Kategoria:{" "}
              {job.profession_detail?.industry_detail?.name
                ? `${job.profession_detail.industry_detail.name} / ${job.profession_detail.name}`
                : job.profession_detail?.name || "—"}
            </p>

            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Clock size={14} />
              Krijuar më: {formatDate(job.created_at)}
            </p>
          </div>

          <div className="premium-card p-5 bg-gray-900 text-white mt-4">
            <h3 className="font-semibold text-sm mb-1">Këshillë</h3>
            <p className="text-gray-300 text-sm">
              Ofertat profesionale kanë përshkrim të qartë, afat dhe çmim.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2">
          <div className="premium-section space-y-4">
            <h2 className="text-lg font-semibold">Menaxhimi i ofertës</h2>

            {/* JOB CLOSED */}
            {isClosed && (
              <div className="premium-card p-6 text-dim">❌ Kjo kërkesë është mbyllur.</div>
            )}

            {/* OFFER LOADING */}
            {!isClosed && loadingOffer && (
              <div className="premium-card p-6">🔄 Po kontrollohet oferta...</div>
            )}

            {/* NO OFFER */}
            {!isClosed && offerInfo.exists === false && !loadingOffer && (
              <div className="premium-card p-6 space-y-4">
                <h3 className="font-semibold text-lg">🚀 Nuk keni dërguar ofertë</h3>

                {!leadUnlocked ? (
                  <div className="flex items-start gap-3">
                    <Lock size={18} />
                    <div>
                      <p className="text-dim">
                        Duhet të hapni lead-in përpara se të krijoni ofertë.
                      </p>
                      <p className="text-sm mt-1">
                        <span className="font-semibold text-green-600">
                          {unlockLeadPriceLabel}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {unlockLeadHint}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-dim">
                      Klikoni më poshtë për të filluar procesin e ofertës.
                    </p>

                    <button
                      onClick={handleCreateOffer}
                      className="premium-btn btn-dark inline-flex items-center gap-2"
                    >
                      <FileText size={16} />
                      Krijo ofertë
                    </button>
                  </>
                )}
              </div>
            )}

            {/* OFFER EXISTS */}
            {!isClosed && offerInfo.exists === true && !loadingOffer && (
              <div className="premium-card p-6 space-y-3">
                <h3 className="font-semibold text-lg">🚀 Gati për ofertë</h3>
                <p className="text-dim">Tani mund të krijoni ofertën tuaj.</p>

                <button
                  onClick={handleCreateOffer}
                  className="premium-btn btn-dark inline-flex items-center gap-2"
                >
                  <FileText size={16} />
                  Krijo ofertën
                </button>
              </div>
            )}

            {/* ============================
                CUSTOMER / PAYMENT GATE
               ============================ */}
            <div className="premium-card p-6">
              <h3 className="font-semibold text-lg mb-3">Informacioni i klientit</h3>

              {!leadUnlocked ? (
                <div className="relative">
                  <div className="blur-sm pointer-events-none select-none space-y-2">
                    <div className="h-4 w-48 bg-gray-200 rounded" />
                    <div className="h-4 w-64 bg-gray-200 rounded" />
                    <div className="h-4 w-40 bg-gray-200 rounded" />
                  </div>

                  <div className="mt-4 flex items-start gap-3">
                    <Lock size={18} />
                    <div className="flex-1">
                      <p className="font-medium">Lead është i mbyllur</p>
                      <p className="text-sm text-gray-600">
                        Hapeni për të parë të dhënat e klientit.
                      </p>

                      <div className="mt-2 text-sm">
                        <span className="font-semibold text-green-600">
                          {unlockLeadPriceLabel}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {unlockLeadHint}
                        </p>
                      </div>

                      <button
                        onClick={handleUnlockLead}
                        disabled={unlocking}
                        className="mt-3 premium-btn btn-dark inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        <Unlock size={16} />
                        {unlocking
                          ? "Po hapet..."
                          : freeLeadsRemaining > 0
                            ? "Hap lead falas"
                            : "Blej lead"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Emri:</strong> {job.customer?.name || "—"}
                  </p>
                  {job.customer?.address && (
                    <p>
                      <strong>Adresa:</strong> {job.customer.address}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    * Kontaktet direkte (telefon/email) janë të mbyllura në këtë fazë.
                  </p>
                </div>
              )}
            </div>

            {/* AUDIT LOGS (VISIBLE ONLY AFTER UNLOCK) */}
            {leadUnlocked && Array.isArray(job.audit_logs) && (
              <div className="premium-card p-6">
                <h3 className="font-semibold text-lg mb-3">Historiku</h3>

                {job.audit_logs.length === 0 ? (
                  <p className="text-dim">Nuk ka histori.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {job.audit_logs.map((log) => (
                      <li key={log.id} className="border rounded-lg p-3">
                        <div className="font-medium">{log.action}</div>
                        <div className="text-gray-600 text-xs">{formatDate(log.created_at)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
