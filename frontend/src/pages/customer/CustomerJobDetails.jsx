// src/pages/customer/CustomerJobDetails.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import { isEmailNotVerifiedError } from "../../utils/emailVerification";
import { toast } from "react-hot-toast";

import { ArrowLeft, MapPin, Euro, Tag, Users, Clock } from "lucide-react";
import StatusBadge from "../../components/ui/StatusBadge";

export default function CustomerJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isCustomer, access, isEmailVerified } = useAuth();

  const [job, setJob] = useState(null);
  const [offers, setOffers] = useState([]);

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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

    return (
      job.is_active &&
      !job.is_completed &&
      !hasWinner &&
      !hasOffers &&
      within48h
    );
  }, [job, acceptedOffer]);

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

    async function fetchOffers() {
      try {
        const res = await api.get(`offers/?job_request=${id}`);
        const list = res.data.results || res.data || [];
        setOffers(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Error loading offers:", err);
      } finally {
        setLoadingOffers(false);
      }
    }

    fetchOffers();
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
  // Update offer status (accept / decline) via backend actions
  // ============================================================
  async function handleUpdateOffer(offerId, newStatus) {
    if (!job) return;

    if (!isEmailVerified) {
      toast.error("Verifiera din email för att fortsätta.");
      return;
    }

    try {
      setActionLoadingId(offerId);
      setInfo("");
      setError("");

      if (newStatus === "accepted") {
        // 🔥 Använd vår custom action → sätter winner, arkiverar, loggar osv.
        const res = await api.post(`jobrequests/${job.id}/accept-offer/`, {
          offer_id: offerId,
        });

        // Backend returnerar uppdaterad JobRequest med matches
        setJob(res.data);
        setOffers(res.data.matches || []);
        setInfo("Oferta u pranua dhe kërkesa u mbyll.");
      } else if (newStatus === "declined") {
        // Använd decline-offer-action för att få audit-loggar
        await api.post(`jobrequests/${job.id}/decline-offer/`, {
          offer_id: offerId,
        });

        setOffers((prev) =>
          prev.map((o) =>
            o.id === offerId ? { ...o, status: "declined" } : o
          )
        );
        setInfo("Oferta u refuzua.");
      }
    } catch (err) {
      console.error("Error updating offer:", err);

      if (isEmailNotVerifiedError(err)) {
        toast.error("Verifiera din email för att fortsätta.");
        return;
      }
      const backendMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error;

      setError(backendMsg || "Gabim gjatë përditësimit të ofertës.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="premium-container">
      {/* HEADER NAV */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/jobrequests")}
          className="premium-btn btn-light inline-flex items-center"
        >
          <ArrowLeft size={18} />
          Kthehu te lista
        </button>

        <button
          onClick={() => navigate("/dashboard/customer")}
          className="premium-btn btn-light inline-flex items-center"
        >
          🏠 Dashboard
        </button>
      </div>

      {/* JOB HEADER */}
      <section className="premium-section mb-5">
        <p className="text-label mb-1">Detajet e kërkesës</p>

        <p className="text-xs text-gray-400 italic mb-2 flex items-center gap-1">
          <Clock size={12} />
          Krijuar më: {formatDate(job.created_at)}
        </p>

        <div className="flex justify-end mb-3">
          {canEdit && (
            <Link
              to={`/jobrequests/${job.id}/edit`}
              className="premium-btn btn-dark text-xs sm:text-sm"
            >
              ✏️ Përditëso kërkesën
            </Link>
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
            <StatusBadge active={job.is_active} />

            {acceptedOffer && (
              <p className="text-xs text-green-700 font-medium">
                ✅ Kompania fituese:{" "}
                {acceptedOffer.company?.company_name || "Kompani"}
              </p>
            )}

            {!job.is_active && !acceptedOffer && (
              <p className="text-xs text-gray-500">
                Kjo kërkesë është mbyllur pa ofertë fituese.
              </p>
            )}
          </div>
        </div>

        {(info || error) && (
          <div className="mt-4 space-y-2 w-full max-w-xl">
            {info && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded">
                {info}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
                {error}
              </div>
            )}
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
                Kategoria: {job.profession_detail?.name || "—"}
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
            <Link to="/jobrequests" className="premium-btn btn-light">
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

            {loadingOffers ? (
              <p className="text-dim">🔄 Po ngarkohen ofertat...</p>
            ) : offers.length === 0 ? (
              <div className="premium-card p-6 text-dim">
                Nuk ka oferta ende.
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => {
                  const isPending = offer.status === "signed";
                  const isAccepted = offer.status === "accepted";
                  const isDeclined = offer.status === "declined";

                  const displayPrice =
                    offer.current_version?.price_amount ||
                    job.budget ||
                    null;

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
                          <h3 className="font-semibold text-gray-900">
                            {offer.company?.company_name || "Kompani"}
                          </h3>
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
                          {displayPrice
                            ? formatBudget(displayPrice)
                            : "Pa çmim"}
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
    </div>
  );
}