// ===========================================
// src/pages/jobrequests/CompanyJobDetails.jsx
// Version:(med LeadUnlockPanel)
// ===========================================

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import LeadChat from "../../components/leads/LeadChat";
import StatusBadge from "../../components/ui/StatusBadge";
import LeadUnlockPanel from "../../components/leads/LeadUnlockPanel";

import paymentService from "../../services/paymentService";
import OfferAccessLock from "../../components/payments/OfferAccessLock";
import toast from "react-hot-toast";


import {
  ArrowLeft,
  MapPin,
  Euro,
  Tag,
  Briefcase,
  Clock,
  Send,
} from "lucide-react";

export default function CompanyJobDetails() {
  const { id } = useParams(); // job request id
  const navigate = useNavigate();
  const { user, isCompany, access } = useAuth();

  // ------------------------------
  // STATE
  // ------------------------------
  const [job, setJob] = useState(null);
  const [existingLead, setExistingLead] = useState(null); // LeadMatch object
  const [hasExistingLead, setHasExistingLead] = useState(false);

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingLead, setLoadingLead] = useState(true);

  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");

  const [buyingOfferAccess, setBuyingOfferAccess] = useState(false);


  // ------------------------------
  // LOAD JOB REQUEST
  // ------------------------------
  useEffect(() => {
    if (!access) return;

    async function fetchJob() {
      setLoadingJob(true);
      try {
        const res = await api.get(`jobrequests/${id}/`);
        setJob(res.data);
      } catch (err) {
        console.error("Error loading job:", err);
        setError("Nuk mund të ngarkohet kërkesa.");
      } finally {
        setLoadingJob(false);
      }
    }

    fetchJob();
  }, [id, access]);

  // ------------------------------
  // LOAD LEADMATCH FOR THIS COMPANY
  // ------------------------------
  async function fetchLead() {
    if (!access) return;

    setLoadingLead(true);

    try {
      const res = await api.get(`leads/leadmatches/?job_request=${id}`);

      const list =
        res.data.rezultatet ||
        res.data.results ||
        [];

      const lead = list[0] || null;

      setExistingLead(lead);
      setHasExistingLead(!!lead);
    } catch (err) {
      console.error("Error loading leadmatch:", err);
      setExistingLead(null);
      setHasExistingLead(false);
    } finally {
      setLoadingLead(false);
    }
  }

  useEffect(() => {
    fetchLead();
  }, [id, access]);

  // Give LeadUnlockPanel a way to refresh
  const refreshLead = async () => {
    await fetchLead();
  };

  // ------------------------------
  // SEND OFFER
  // ------------------------------
  async function handleBuyOfferAccess() {
    try {
      setBuyingOfferAccess(true);
      await paymentService.buyOfferAccess(id);
      toast.success("Offer access upplåst");
      
      // 🔑 refetch job – backend avgör
      const res = await api.get(`jobrequests/${id}/`);
      setJob(res.data);
    } catch (err) {
      toast.error("Kunde inte köpa offer access");
    } finally {
      setBuyingOfferAccess(false);
    }
  }


  async function handleSendOffer(e) {
    e.preventDefault();

    if (!message.trim()) return;
    if (!price || Number(price) <= 0) {
      alert("Vendosni një çmim të vlefshëm.");
      return;
    }

    setSending(true);

    try {
      const res = await api.post("leads/leadmatches/", {
        job_request: id,
        message,
        price,
      });

      // oferta u krijua → ruaj leadmatch
      setExistingLead(res.data);
      setHasExistingLead(true);

      setMessage("");
      setPrice("");
    } catch (err) {
      console.error("Send offer error:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.price?.[0] ||
        err.response?.data?.message?.[0] ||
        "Nuk mund të dërgohet oferta.";

      alert(detail);
    } finally {
      setSending(false);
    }
  }

  // ------------------------------
  // GUARDS
  // ------------------------------
  if (!user) return <div className="p-6">Duke ngarkuar...</div>;

  if (!isCompany)
    return (
      <div className="p-6 text-red-600 font-semibold">
        Akses i ndaluar. (Vetëm kompanitë mund ta shohin këtë faqe)
      </div>
    );

  if (loadingJob)
    return <p className="text-center mt-10">🔄 Po ngarkohet...</p>;

  if (error)
    return (
      <p className="text-center text-red-500 mt-10">{error}</p>
    );

  if (!job)
    return <p className="text-center mt-10">Kërkesa nuk u gjet.</p>;

  const isOfferLocked =
  job.locked === true &&
  job.lock_reason === "offer_access_required";

  const isClosed = !job.is_active;
  const formatBudget = (b) => (b ? `${b} €` : "Pa buxhet");
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("sv-SE");

  return (
    <div className="relative">
    {isOfferLocked && (
      <OfferAccessLock
        onBuy={handleBuyOfferAccess}
        loading={buyingOfferAccess}
      />
    )}

    <div className={isOfferLocked ? "pointer-events-none blur-sm" : ""}>

    <div className="premium-container">
      {/* TOP NAV */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/jobrequests")}
          className="premium-btn btn-light inline-flex items-center"
        >
          <ArrowLeft size={18} />
          Kthehu te lista
        </button>

        <button
          onClick={() => navigate("/dashboard/company")}
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
            <p className="text-dim">
              Shikoni detajet e punës dhe dërgoni ofertën tuaj.
            </p>
          </div>

          <StatusBadge active={job.is_active} />
        </div>
      </section>

      {/* -----------------------------------------
           🔐 UNLOCK PANEL — only if offer exists
         ----------------------------------------- */}
      {hasExistingLead && existingLead && (
        <LeadUnlockPanel lead={existingLead} refreshLead={refreshLead} />
      )}

      {/* CHAT — only if chat is unlocked */}
      {!loadingLead && existingLead?.can_chat && (
        <LeadChat lead={existingLead} />
      )}

      {/* JOB INFO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT SIDE */}
        <div className="lg:col-span-1">
          <div className="premium-card p-6 space-y-3 text-gray-700">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Briefcase size={18} />
              Informacioni i kërkesës
            </h2>

            <p>{job.description || "Nuk ka përshkrim."}</p>

            <p className="flex items-center gap-2">
              <MapPin size={16} /> Lokacioni: {job.location}
            </p>

            <p className="flex items-center gap-2">
              <Euro size={16} /> Buxheti: {formatBudget(job.budget)}
            </p>

            <p className="flex items-center gap-2">
              <Tag size={16} /> Kategoria: {job.kategoria || "—"}
            </p>

            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Clock size={14} />
              Krijuar më: {formatDate(job.created_at)}
            </p>
          </div>

          <div className="premium-card p-5 bg-gray-900 text-white mt-4">
            <h3 className="font-semibold text-sm mb-1">Këshillë</h3>
            <p className="text-gray-300 text-sm">
              Shkruani një ofertë të qartë me çmim, afat dhe çfarë përfshihet.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="lg:col-span-2">
          <div className="premium-section">
            <h2 className="text-lg font-semibold mb-4">
              {isClosed
                ? "Kjo punë është mbyllur."
                : hasExistingLead
                ? "Oferta juaj"
                : "Dërgo ofertë për këtë punë"}
            </h2>

            {/* CLOSED */}
            {isClosed && (
              <div className="premium-card p-6 text-dim">
                ❌ Kjo kërkesë është mbyllur.
              </div>
            )}

            {/* EXISTING OFFER */}
            {!isClosed && hasExistingLead && existingLead && (
              <div className="premium-card p-6 bg-green-50 border border-green-300">
                <h3 className="font-semibold text-lg text-green-700 mb-2">
                  ✔️ Ju keni dërguar ofertë
                </h3>

                <p className="text-gray-700 mb-3 whitespace-pre-line">
                  {existingLead.message || "(Pa mesazh)"}
                </p>

                {existingLead.price && (
                  <p className="text-gray-700 mb-1">
                    💶 Çmimi: {existingLead.price} €
                  </p>
                )}

                <p className="text-xs text-gray-500">
                  Dërguar më:{" "}
                  {new Date(
                    existingLead.created_at
                  ).toLocaleString("sv-SE")}
                </p>
              </div>
            )}

            {/* SEND OFFER FORM */}
            {!isClosed && !hasExistingLead && (
              <form
                onSubmit={handleSendOffer}
                className="premium-card p-6 space-y-4"
              >
                <textarea
                  rows={4}
                  value={message}
                  required
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Shkruani ofertën tuaj..."
                  className="w-full p-3 rounded-lg border border-gray-300"
                />

                <input
                  type="number"
                  value={price}
                  required
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Çmimi (€)"
                  className="w-full p-3 rounded-lg border border-gray-300"
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="premium-btn btn-dark inline-flex items-center gap-2"
                >
                  <Send size={16} />
                  {sending ? "Duke dërguar..." : "Dërgo ofertë"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
    </div>
    </div>

  
  );
}
