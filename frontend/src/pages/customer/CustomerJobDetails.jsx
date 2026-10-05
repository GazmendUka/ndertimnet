import jobCategory from "../../utils/jobCategory";
// src/pages/customer/CustomerJobDetails.jsx

import React, { useEffect, useState, useMemo } from "react";
import { PublicationBilling } from "../../components/payments/PlatformBilling";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import { toast } from "react-hot-toast";

import { ArrowLeft, MapPin, Euro, Tag, Users, Clock, ShieldCheck } from "lucide-react";
import ModerationBadge from "../../components/ui/ModerationBadge";
import JobStatusBadge from "../../components/ui/JobStatusBadge";
import DeleteModal from "../../components/ui/DeleteModal";
import CompanyRatingSummary from "../../components/reviews/CompanyRatingSummary";
import OfferComparison, { offerPrice } from "../../components/offers/OfferComparison";

export default function CustomerJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isCustomer, access, isEmailVerified } = useAuth();

  const [job, setJob] = useState(null);
  const [offers, setOffers] = useState([]);

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);

  const [error, setError] = useState("");
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const completeWork = async () => {
    setCompleting(true);
    try {
      const response = await api.post(`/jobrequests/${id}/complete-work/`, { confirm: true });
      setJob(response.data); setCompleteConfirm(false);
      toast.success("Përfundimi i punës u regjistrua.");
    } catch (e) { toast.error(e.response?.data?.detail || "Provoni përsëri."); }
    finally { setCompleting(false); }
  };

  // ---------------- Helpers ----------------
  const formatBudget = (b) => (b ? `${b} €` : "Pa buxhet");
  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("sv-SE") : "—";
  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("sv-SE", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const statusLabel = (s) =>
    s === "accepted"
      ? "Pranuar"
      : s === "declined"
      ? "Refuzuar"
      : "Në pritje";

  const statusClasses = (s) =>
    s === "accepted"
      ? "bg-green-100 text-green-700 border-green-200"
      : s === "declined"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-yellow-100 text-yellow-700 border-yellow-200";

  const acceptedOffer = useMemo(
    () => offers.find((o) => o.status === "accepted"),
    [offers]
  );

  // ------------------------------------------------------------
  // Edit permission (UX-level only – backend is source of truth)
  // ------------------------------------------------------------
  const canEdit = useMemo(() => {
    if (!job) return false;

    const hasOffers = job.offers_count > 0;
    const hasWinner = !!job.winner_offer;

    const createdAt = job.created_at ? new Date(job.created_at) : null;

    if (!createdAt) return false;

    const now = new Date();
    const within48h =
      now.getTime() - createdAt.getTime() <= 48 * 60 * 60 * 1000;

    const canEditModeration = ["pending", "changes_requested"].includes(job.moderation_status);

    return (
      (job.is_active || canEditModeration) &&
      !job.is_completed &&
      !hasWinner &&
      !hasOffers &&
      (canEditModeration || within48h)
    );
  }, [job]);

  // ------------------------------------------------------------
  // Delete Jobrequest (All functionality in backend)
  // ------------------------------------------------------------
  const deleteReason = useMemo(() => {
    if (!job) return "";

    const hasAccepted = offers.some(o => o.status === "accepted");
    const hasPending = offers.some(o => o.status === "signed");

    if (job.is_completed || job.completed_at) {
      return "Kërkesa është përfunduar";
    }

    if (hasAccepted || job.winner_offer) {
      return "Ka një ofertë të pranuar";
    }

    if (hasPending) {
      return "Ka oferta në pritje";
    }

    return "";
  }, [job, offers]);
  const canDelete = deleteReason === "";

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ============================================================
  // Load job request (kundens eget jobb)
  // ============================================================
  useEffect(() => {
    if (!access) {
      setError("Ju lutem hyni përsëri.");
      setLoadingJob(false);
      return;
    }

    async function fetchJob() {
      try {
        // queryset i backend begränsas redan till kundens egna jobb
        const res = await api.get(`jobrequests/${id}/`);
        setJob(res.data);
      } catch (err) {
        console.error("Error loading job:", err);
        setError("Nuk mund të ngarkohet kërkesa e punës.");
      } finally {
        setLoadingJob(false);
      }
    }

    fetchJob();
  }, [id, access]);

  // ============================================================
  // Load offers for this job
  // ============================================================
  useEffect(() => {
    if (!access) {
      setLoadingOffers(false);
      return;
    }
    let cancelled = false;
    setLoadingOffers(true);
    setOffers([]);
    async function fetchOffers() {
      try {
        const list = [];
        let page = 1;
        while (!cancelled) {
          // Keep credentials on our own endpoint; never follow an absolute next URL.
          const res = await api.get(`offers/?job_request=${id}${page > 1 ? `&page=${page}` : ""}`);
          const rows = res.data.results || res.data;
          if (!Array.isArray(rows)) throw new Error("Invalid offer list");
          list.push(...rows);
          if (!res.data.next) break;
          if (!rows.length || page >= 100) throw new Error("Incomplete offer list");
          page += 1;
        }
        if (!cancelled) setOffers([...new Map(list.map(o => [o.id, o])).values()]);
      } catch (err) {
        if (!cancelled) setError("Ofertat nuk u ngarkuan. Ringarkoni faqen për të provuar përsëri.");
      } finally {
        if (!cancelled) setLoadingOffers(false);
      }
    }

    fetchOffers();
    return () => { cancelled = true; };
  }, [id, access]);

  // ============================================================
  // Guard states
  // ============================================================
  if (!user) return <div className="p-6">Duke ngarkuar...</div>;

  if (!isCustomer)
    return (
      <div className="p-6 text-red-600 font-semibold">
        Akses i ndaluar. (Vetëm klientët mund ta shohin këtë faqe)
      </div>
    );

  if (loadingJob)
    return <p className="text-center mt-10">🔄 Po ngarkohet kërkesa...</p>;
  if (error) return <p className="text-center text-red-500 mt-10">{error}</p>;
  if (!job) return <p className="text-center mt-10">Kërkesa nuk u gjet.</p>;

  // ============================================================
  // Delete jobrequest via backend actions
  // ============================================================
  async function handleDeleteJob() {
    if (!canDelete) return;

    if (!isEmailVerified) {
      toast.error("Ju lutem verifikoni email-in për të vazhduar.");
      return;
    }

    if (!job) return;

    setDeleteLoading(true);

    try {
      await api.delete(`jobrequests/${job.id}/`);

      toast.success("Kërkesa u fshi me sukses.");

      navigate("/customer/jobrequests");
    } catch (err) {
      const backendMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Gabim gjatë fshirjes së kërkesës.";

      toast.error(backendMsg);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  }

  // ============================================================
  // UI
  // ============================================================
  const jobRequestsPath = "/customer/jobrequests";
  const dashboardPath = "/customer";
  return (
    <div className="premium-container">
      <PublicationBilling jobId={id} />
      {/* HEADER NAV */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate(jobRequestsPath)}
          className="premium-btn btn-light inline-flex items-center"
        >
          <ArrowLeft size={18} />
          Kthehu te lista
        </button>

        <button
          onClick={() => navigate(dashboardPath)}
          className="premium-btn btn-light inline-flex items-center"
        >
          🏠 Dashboard
        </button>
      </div>

      {/* JOB HEADER */}
      {job.inactive_marked_at && <div className="rounded-xl bg-amber-50 p-4 mb-4"><strong>Kërkesa duket joaktive në platformë.</strong><p>A ju nevojitet ende puna? Hapni ofertat dhe përgjigjuni kompanive. Kjo shenjë nuk mbyll kërkesën dhe nuk krijon kredite automatike.</p></div>}
      {job.moderation_status !== "approved" && (
        <section className={`mb-5 rounded-2xl border p-5 sm:p-6 ${
          job.moderation_status === "changes_requested"
            ? "border-blue-200 bg-blue-50"
            : job.moderation_status === "rejected"
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
        }`}>
          <ModerationBadge status={job.moderation_status} />
          <h2 className="mt-4 font-semibold text-gray-900">
            {job.moderation_status === "changes_requested"
              ? "Përditësoni kërkesën tuaj"
              : job.moderation_status === "pending"
              ? "Kërkesa po shqyrtohet"
              : "Kërkesa nuk është publikuar"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            {job.moderation_note || (
              job.moderation_status === "pending"
                ? "Do t'ju njoftojmë sapo kërkesa të miratohet. Kompanitë nuk mund ta shohin ende."
                : "Kontaktoni mbështetjen nëse keni pyetje për vendimin."
            )}
          </p>
          {job.moderation_status === "changes_requested" && canEdit && (
            <Link to={`${jobRequestsPath}/${job.id}/edit`} className="premium-btn btn-dark mt-4">
              Përditëso dhe ridërgo
            </Link>
          )}
        </section>
      )}

      <section className="premium-section mb-5">
        <p className="text-label mb-1">Detajet e kërkesës</p>

        <p className="text-xs text-gray-400 italic mb-2 flex items-center gap-1">
          <Clock size={12} />
          Krijuar më: {formatDate(job.created_at)}
        </p>

        <div className="flex flex-col items-end mb-3 gap-1">

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!canDelete) return;
                setShowDeleteModal(true);
              }}
              disabled={!canDelete || deleteLoading}
              aria-disabled={!canDelete}
              title={!canDelete ? deleteReason : ""}
              className={`premium-btn text-xs sm:text-sm ${
                canDelete
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  : "bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
              }`}
            >
              {deleteLoading ? "Duke fshirë..." : "🗑️ Fshij kërkesën"}
            </button>

            {canEdit && (
              <Link
                to={`${jobRequestsPath}/${job.id}/edit`}
                className="premium-btn btn-dark text-xs sm:text-sm"
              >
                ✏️ Përditëso kërkesën
              </Link>
            )}
          </div>

          {!canDelete && deleteReason && (
            <p className="text-xs text-gray-500 text-right max-w-xs flex items-center gap-1 justify-end">
              ⚠️ {deleteReason}
            </p>
          )}

        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div className="max-w-4xl">
            <h1 className="page-title mb-4">{job.title}</h1>

            {job.description && (
              <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {job.description || "Nuk ka përshkrim."}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <JobStatusBadge job={job} />

            {acceptedOffer && <div className="text-sm space-y-2">
              <p>{job.completed_at ? "Puna ka përfunduar" : "Oferta u pranua — puna në vazhdim"}</p>
              {!job.completed_at && <button className="underline" onClick={() => setCompleteConfirm(true)}>Shëno punën si të përfunduar</button>}
              {completeConfirm && <div role="alert">
                <p>Konfirmoni vetëm pasi puna të ketë përfunduar. Pranimi i ofertës nuk e përfundon punën.</p>
                <button disabled={completing} onClick={completeWork}>Konfirmo përfundimin</button>{" "}
                <button disabled={completing} onClick={() => setCompleteConfirm(false)}>Kthehu</button>
              </div>}
            </div>}
            {acceptedOffer && (
              <p className="text-xs text-green-700 font-medium">
                ✅ Kompania fituese:{" "}
                {acceptedOffer.company?.company_name || "Kompani"}
              </p>
            )}

            {!job.is_active && !acceptedOffer && !job.winner_offer &&
              job.moderation_status === "approved" && !job.is_completed &&
              job.status !== "cancelled" && (
              <p className="text-xs text-gray-500">
                Kjo kërkesë është mbyllur pa ofertë fituese.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 space-y-2 w-full max-w-xl">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
              {error}
            </div>
          </div>
        )}
      </section>

      {/* GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT SIDE */}
        <div className="lg:col-span-1 space-y-4">
          <div className="premium-card p-6">
            <h2 className="text-base font-semibold mb-3">
              Informacioni i punës
            </h2>

            <div className="space-y-2 text-sm text-gray-700">
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
                {jobCategory(job)}
              </p>
            </div>
          </div>

          <div className="premium-card p-5 bg-gray-900 text-white">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users size={14} /> Këshillë
            </h3>
            <p className="text-sm text-gray-300 mb-3">
              Mos shikoni vetëm çmimin — lexoni detajet dhe cilësinë e
              ofertës.
            </p>
            <Link to={jobRequestsPath} className="premium-btn btn-light">
              Shiko kërkesat e tjera
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE (OFFERS) */}
        <div className="lg:col-span-2">
          <div className="premium-section">
            <div className="flex justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold">
                Ofertat nga kompanitë
              </h2>
              <p className="text-xs text-gray-500">
                {loadingOffers
                  ? "Po ngarkohen..."
                  : offers.length === 0
                  ? "Asnjë ofertë ende"
                  : `${offers.length} ofertë(a)`}
              </p>
            </div>

            {!loadingOffers && <OfferComparison key={id} offers={offers} />}
            {job.moderation_status !== "approved" ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                Ofertat do të aktivizohen pasi kërkesa të miratohet dhe publikohet.
              </div>
            ) : loadingOffers ? (
              <p className="text-dim">🔄 Po ngarkohen ofertat...</p>
            ) : offers.length === 0 ? (
              <div className="premium-card p-6 text-dim">
                Nuk ka oferta ende.
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => {
                  const isAccepted = offer.status === "accepted";
                  const isDeclined = offer.status === "declined";

                  const displayPrice = offerPrice(offer.current_version);

                  return (
                    <Link
                      to={`/customer/offers/${offer.id}`}
                      key={offer.id}
                      className={`block premium-card p-5 border hover:border-blue-400 hover:shadow-md transition ${
                        isAccepted
                          ? "bg-green-50 border-green-300"
                          : isDeclined
                          ? "bg-red-50 border-red-200"
                          : "bg-white border-gray-100"
                      }`}
                    >
                      <div className="flex justify-between mb-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {offer.company?.company_name || "Kompani"}
                            </h3>
                            {offer.company?.is_verified && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <ShieldCheck size={12} />
                                Kompani e verifikuar
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <CompanyRatingSummary summary={offer.company?.rating_summary} compact />
                          </div>
                          <p className="text-xs text-gray-500">
                            Dërguar më: {formatDateTime(offer.created_at)}
                          </p>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses(
                            offer.status
                          )}`}
                        >
                          {statusLabel(offer.status)}
                        </span>
                      </div>

                      {offer.current_version?.presentation_text && (
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                          {offer.current_version.presentation_text}
                        </div>
                      )}

                      <div className="flex flex-wrap justify-between items-center mt-3 gap-3">

                        <span className="text-sm flex items-center gap-1">
                          <Euro size={14} />
                          Oferta:{" "}
                          {displayPrice}
                        </span>

                        {/* VIEW OFFER BUTTON */}
                        <div>
                          <span className="premium-btn btn-dark text-xs">
                            Shiko ofertën →
                          </span>
                        </div>

                        {isAccepted && (
                          <p className="text-xs text-green-700 font-medium">
                            ✅ Oferta fituese
                          </p>
                        )}

                      </div>

                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteJob}
        loading={deleteLoading}
        title="Fshij kërkesën"
        description={
          <>
            A jeni i sigurt që dëshironi ta fshini këtë kërkesë?
            <br />
            <br />
            Ky veprim nuk mund të kthehet.
          </>
        }
      />
    </div>
  );
}
