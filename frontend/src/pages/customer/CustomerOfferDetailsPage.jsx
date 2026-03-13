// ==========================================================
// src/pages/customer/CustomerOfferDetailsPage.jsx
// Customer marketplace offer details page - v3
// Albanian UI, Apple-inspired, premium marketplace layout
// ==========================================================

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import {
  ArrowLeft,
  Building2,
  Briefcase,
  MapPin,
  Euro,
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  Clock3,
  CalendarDays,
  Phone,
  Mail,
  Star,
  ShieldCheck,
  Hammer,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ==========================================================
// Small UI helpers
// ==========================================================

function SectionTitle({ icon: Icon, children, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        {Icon ? <Icon size={20} /> : null}
        {children}
      </h2>
      {subtitle ? (
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      ) : null}
    </div>
  );
}

function PlaceholderInfoCard({ icon: Icon, title, value = "Së shpejti" }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gray-50 p-2 border border-gray-200">
          <Icon size={16} className="text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-500">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-sm text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "accepted") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
        E pranuar
      </span>
    );
  }

  if (normalized === "rejected" || normalized === "declined") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold">
        E refuzuar
      </span>
    );
  }

  if (normalized === "signed") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold">
        Në pritje të vendimit
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
      {status || "Status i panjohur"}
    </span>
  );
}

// ==========================================================
// Page
// ==========================================================

export default function CustomerOfferDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { access, user } = useAuth();

  const [offer, setOffer] = useState(null);
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [version, setVersion] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decisionLoading, setDecisionLoading] = useState("");

  const API_URL = process.env.REACT_APP_API_BASE_URL || "";

  // ==========================================================
  // LOAD OFFER
  // ==========================================================

  const fetchOffer = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(`offers/${id}/`);
      const data = res?.data;

      if (!data) {
        setError("Oferta nuk u gjet.");
        return;
      }

      setOffer(data);
      setJob(data.job_request || null);
      setCompany(data.company || null);
      setVersion(data.current_version || null);
    } catch (err) {
      console.error("Error loading offer:", err);
      setError("Nuk mund të ngarkohet oferta.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (access && id) {
      fetchOffer();
    }
  }, [access, id]);

  // ==========================================================
  // ACCEPT OFFER
  // ==========================================================

  const handleAccept = async () => {
    try {
      setDecisionLoading("accept");

      await api.post(`offers/${id}/decision/`, {
        decision: "accept",
      });

      await fetchOffer();
      alert("Oferta u pranua me sukses!");
    } catch (err) {
      console.error(err);
      alert("Nuk mund të pranohet oferta.");
    } finally {
      setDecisionLoading("");
    }
  };

  // ==========================================================
  // DECLINE OFFER
  // ==========================================================

  const handleDecline = async () => {
    const confirmed = window.confirm(
      "A jeni i sigurt që dëshironi ta refuzoni këtë ofertë?"
    );

    if (!confirmed) return;

    try {
      setDecisionLoading("reject");

      await api.post(`offers/${id}/decision/`, {
        decision: "reject",
      });

      alert("Oferta u refuzua.");
      navigate("/dashboard/customer");
    } catch (err) {
      console.error(err);
      alert("Nuk mund të refuzohet oferta.");
    } finally {
      setDecisionLoading("");
    }
  };

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================

  const createdDate = useMemo(() => {
    if (!offer?.created_at) return "—";
    try {
      return new Date(offer.created_at).toLocaleString("sq-AL");
    } catch {
      return offer.created_at;
    }
  }, [offer]);

  const pdfUrl = `${API_URL}/offers/${offer?.id}/pdf/`;

  const canDecide = offer?.status === "signed";

  // ==========================================================
  // GUARDS
  // ==========================================================

  if (!user) {
    return <div className="p-6">Duke ngarkuar...</div>;
  }

  if (user.role !== "customer") {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Nuk keni qasje në këtë faqe.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="premium-container mt-6">
        <div className="premium-card p-6 flex items-center gap-3 text-gray-700">
          <Loader2 size={18} className="animate-spin" />
          Po ngarkohet oferta...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-container mt-6">
        <div className="premium-card p-6 border border-red-200 bg-red-50">
          <div className="flex items-start gap-3 text-red-700">
            <AlertCircle size={18} className="mt-0.5" />
            <div>
              <p className="font-semibold">Gabim</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="premium-container mt-6">
        <p className="text-center mt-10">Oferta nuk u gjet.</p>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="premium-container mt-6">
      {/* Top nav */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="premium-btn btn-light inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Kthehu
        </button>

        <div className="flex flex-wrap gap-2">
          {job?.id ? (
            <Link to={`/jobrequests/${job.id}`} className="premium-btn btn-light">
              Shiko kërkesën
            </Link>
          ) : null}

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="premium-btn btn-dark inline-flex items-center gap-2"
          >
            <FileText size={18} />
            Hap PDF
          </a>
        </div>
      </div>

      {/* Hero */}
      <div className="premium-section mb-8">
        <div className="premium-card p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <StatusBadge status={offer?.status} />
                <span className="text-sm text-gray-500 inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  Dërguar më: {createdDate}
                </span>
              </div>

              <h1 className="page-title mb-2">
                Oferta nga {company?.company_name || "kompania"}
              </h1>

              <p className="text-dim max-w-2xl">
                Këtu mund të shikoni detajet e ofertës, informacionin rreth kompanisë,
                kontratën në PDF, komunikimin përmes chat-it dhe më pas të vendosni
                nëse dëshironi ta pranoni ose refuzoni ofertën.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:min-w-[420px]">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Çmimi
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {version?.price_amount
                    ? `${version.price_amount} ${version?.currency || "EUR"}`
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Afati
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {version?.duration_text || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Kompania
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {company?.company_name || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Company */}
          {company && (
            <div className="premium-section">
              <SectionTitle
                icon={Building2}
                subtitle="Njihuni më mirë me kompaninë që ka dërguar ofertën."
              >
                Kompania
              </SectionTitle>

              <div className="premium-card p-5 md:p-6">
                <div className="flex flex-col gap-6">
                  <div>
                    <p className="text-xl font-semibold text-gray-900">
                      {company?.company_name || "Kompani"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Oferta u dërgua më: {createdDate}
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <InfoRow
                      icon={Phone}
                      label="Telefoni"
                      value={company?.phone || "—"}
                    />
                    <InfoRow
                      icon={Mail}
                      label="Email"
                      value={company?.user?.email || "—"}
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <PlaceholderInfoCard
                      icon={Star}
                      title="Vlerësimi i kompanisë"
                    />
                    <PlaceholderInfoCard
                      icon={ShieldCheck}
                      title="Statusi i verifikimit"
                    />
                    <PlaceholderInfoCard
                      icon={Hammer}
                      title="Projektet e realizuara në Ndertimnet"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Job request */}
          {job && (
            <div className="premium-section">
              <SectionTitle
                icon={Briefcase}
                subtitle="Kjo është kërkesa juaj për të cilën është dërguar oferta."
              >
                Kërkesa juaj për punë
              </SectionTitle>

              <div className="premium-card p-5 md:p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {job?.description || "—"}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin size={16} />
                      <span className="font-medium">Lokacioni</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {job?.city_detail?.name || job?.location || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Euro size={16} />
                      <span className="font-medium">Buxheti</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {job?.budget ? `${job.budget} €` : "Pa buxhet"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Offer details */}
          {version && (
            <div className="premium-section">
              <SectionTitle
                icon={Euro}
                subtitle="Këtu shihni përshkrimin, çmimin dhe afatin e ofertës."
              >
                Detajet e ofertës
              </SectionTitle>

              <div className="premium-card p-5 md:p-6">
                <div className="grid md:grid-cols-3 gap-4 mb-5">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Çmimi
                    </p>
                    <p className="text-xl font-semibold text-gray-900 mt-2">
                      {version?.price_amount
                        ? `${version.price_amount} ${version?.currency || "EUR"}`
                        : "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Afati
                    </p>
                    <p className="text-lg font-semibold text-gray-900 mt-2 inline-flex items-center gap-2">
                      <Clock3 size={16} />
                      {version?.duration_text || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Monedha
                    </p>
                    <p className="text-lg font-semibold text-gray-900 mt-2">
                      {version?.currency || "EUR"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    Përshkrimi i ofertës
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-7">
                    {version?.presentation_text || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chat */}
          <div className="premium-section">
            <SectionTitle
              icon={MessageSquare}
              subtitle="Përdorni chat-in për të mbajtur komunikimin të dokumentuar."
            >
              Komunikoni me kompaninë
            </SectionTitle>

            <div className="premium-card p-5 md:p-6 space-y-5">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-900 leading-7">
                  Ju rekomandojmë që të gjitha komunikimet me kompaninë t’i bëni përmes
                  chat-it. Kjo ju ndihmon që çdo sqarim, marrëveshje dhe ndryshim të jetë
                  i dokumentuar në një vend.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/chat/offer/${offer.id}`)}
                  className="premium-btn btn-dark inline-flex items-center gap-2"
                >
                  <MessageSquare size={18} />
                  Hap chat
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} className="text-gray-600" />
                  <p className="text-sm font-medium text-gray-900">
                    Mesazhi i fundit
                  </p>
                </div>
                <p className="text-sm text-gray-500">Së shpejti</p>
              </div>
            </div>
          </div>

          {/* Contract */}
          <div className="premium-section">
            <SectionTitle
              icon={FileText}
              subtitle="Lexoni kontratën para se të merrni vendimin tuaj."
            >
              Kontrata
            </SectionTitle>

            <div className="premium-card p-3">
              <iframe
                title="Kontrata PDF"
                src={pdfUrl}
                className="w-full h-[650px] rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="premium-card p-6 h-fit sticky top-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              Vendimi juaj
            </h3>

            <p className="text-sm text-gray-600 mb-5 leading-7">
              Nëse jeni të kënaqur me ofertën, kontratën dhe komunikimin me kompaninë,
              mund ta pranoni ose ta refuzoni nga këtu.
            </p>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 mb-5">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                Statusi aktual
              </p>
              <StatusBadge status={offer?.status} />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleAccept}
                disabled={!canDecide || decisionLoading !== ""}
                className="premium-btn bg-green-600 text-white flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {decisionLoading === "accept" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Prano ofertën
              </button>

              <button
                onClick={handleDecline}
                disabled={!canDecide || decisionLoading !== ""}
                className="premium-btn bg-red-600 text-white flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {decisionLoading === "reject" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <XCircle size={18} />
                )}
                Refuzo ofertën
              </button>
            </div>

            {!canDecide ? (
              <p className="text-xs text-gray-500 mt-4">
                Kjo ofertë aktualisht nuk është në gjendje për vendim.
              </p>
            ) : null}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-3">
                Përmbledhje e shpejtë
              </p>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start justify-between gap-4">
                  <span>Kompania</span>
                  <span className="text-right text-gray-900 font-medium">
                    {company?.company_name || "—"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span>Çmimi</span>
                  <span className="text-right text-gray-900 font-medium">
                    {version?.price_amount
                      ? `${version.price_amount} ${version?.currency || "EUR"}`
                      : "—"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span>Afati</span>
                  <span className="text-right text-gray-900 font-medium">
                    {version?.duration_text || "—"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span>Kontrata</span>
                  <span className="text-right text-gray-900 font-medium">
                    PDF
                  </span>
                </div>
              </div>
            </div>

            {job?.id ? (
              <div className="mt-6">
                <Link
                  to={`/jobrequests/${job.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Shiko kërkesën
                  <ChevronRight size={16} />
                </Link>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                Këshillë
              </p>
              <p className="text-sm text-amber-800 leading-7">
                Para se të merrni vendimin, lexoni kontratën me kujdes dhe
                diskutoni çdo paqartësi me kompaninë përmes chat-it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}