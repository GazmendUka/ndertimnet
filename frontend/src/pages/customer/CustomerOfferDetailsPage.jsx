// ===========================================
// src/pages/customer/CustomerOfferDetailsPage.jsx
// Customer view – see offer, accept / decline
// ===========================================

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Euro,
  Building2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function CustomerOfferDetailsPage() {
  console.log("CustomerOfferDetailsPage mounted");

  const { id } = useParams();
  const navigate = useNavigate();
  const { access, user } = useAuth();

  const [offer, setOffer] = useState(null);
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [version, setVersion] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "";

  // ===========================================
  // LOAD OFFER
  // ===========================================
  const fetchOffer = async () => {

    try {

      setLoading(true);

      const res = await api.get(`offers/${id}/`);
      const data = res?.data;

      console.log("OFFER API RESPONSE:", data);

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

  // ===========================================
  // ACCEPT OFFER
  // ===========================================
  const handleAccept = async () => {

    try {

      await api.post(`offers/${id}/decision/`, {
        decision: "accept"
      });

      await fetchOffer();

      alert("Ju e pranuat ofertën!");

    } catch (err) {

      console.error(err);
      alert("Nuk mund të pranohet oferta.");

    }

  };

  // ===========================================
  // DECLINE OFFER
  // ===========================================
  const handleDecline = async () => {

    try {

      await api.post(`offers/${id}/decision/`, {
        decision: "reject"
      });

      alert("Oferta u refuzua.");
      navigate("/dashboard/customer");

    } catch (err) {

      console.error(err);
      alert("Nuk mund të refuzohet oferta.");

    }

  };

  // ===========================================
  // GUARDS
  // ===========================================

  if (!user) {
    return <div className="p-6">Duke ngarkuar…</div>;
  }

  if (user.role !== "customer") {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Nuk keni qasje në këtë faqe.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Po ngarkohet oferta…</div>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  if (!offer) {
    return <p className="text-center mt-10">Oferta nuk u gjet.</p>;
  }

  const createdDate = offer?.created_at
    ? new Date(offer.created_at).toLocaleString("sv-SE")
    : "—";

  // ===========================================
  // UI
  // ===========================================

  return (

    <div className="premium-container mt-4">

      {/* TOP NAV */}
      <div className="flex justify-between items-center mb-6">

        <button
          onClick={() => navigate("/dashboard/customer")}
          className="premium-btn btn-light inline-flex items-center"
        >
          <ArrowLeft size={18} />
          Kthehu te paneli im
        </button>

        <div className="flex gap-2">

          {job && (
            <Link
              to={`/jobrequests/${job.id}`}
              className="premium-btn btn-light"
            >
              Shiko kërkesën
            </Link>
          )}

          <a
            href={`${API_URL}/offers/${offer.id}/pdf/`}
            target="_blank"
            rel="noopener noreferrer"
            className="premium-btn btn-dark"
          >
            PDF
          </a>

        </div>

      </div>

      {/* HEADER */}
      <h1 className="page-title mb-2">
        Oferta nga kompania
      </h1>

      <p className="text-dim mb-4">
        Kontrolloni ofertën dhe vendosni nëse dëshironi ta pranoni.
      </p>

      {/* COMPANY */}
      {company && (

        <div className="premium-section mb-4">

          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Building2 size={20} />
            Kompania
          </h2>

          <div className="premium-card p-4 space-y-1 text-gray-700">

            <p className="font-semibold">
              {company?.company_name || "Kompani"}
            </p>

            <p>📞 {company?.phone || "—"}</p>
            <p>📧 {company?.user?.email || "—"}</p>

            <p className="text-xs text-gray-500 mt-1">
              Oferta dërguar më: {createdDate}
            </p>

          </div>

        </div>

      )}

      {/* JOB */}
      {job && (

        <div className="premium-section mb-4">

          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Briefcase size={18} />
            Detajet e punës
          </h2>

          <div className="premium-card p-4 space-y-2 text-gray-700">

            <p>{job?.description || "—"}</p>

            <p className="flex items-center gap-2">
              <MapPin size={16} />
              {job?.city_detail?.name || job?.location || "—"}
            </p>

            <p className="flex items-center gap-2">
              <Euro size={16} />
              {job?.budget ? `${job.budget} €` : "Pa buxhet"}
            </p>

          </div>

        </div>

      )}

      {/* OFFER */}
      {version && (

        <div className="premium-section mb-4">

          <h2 className="text-lg font-semibold mb-3">
            Oferta e kompanisë
          </h2>

          <div className="premium-card p-4 text-gray-700 space-y-3">

            {version?.presentation_text && (
              <p className="whitespace-pre-line">
                {version.presentation_text}
              </p>
            )}

            <p className="text-lg font-bold">
              💶 {version?.price_amount || "—"} {version?.currency || "EUR"}
            </p>

            {version?.duration_text && (
              <p className="text-sm text-gray-600">
                Afati: {version.duration_text}
              </p>
            )}

          </div>

        </div>

      )}

      {/* ACTIONS */}
      {offer?.status === "signed" && (

        <div className="flex gap-4 mt-4">

          <button
            onClick={handleAccept}
            className="premium-btn bg-green-600 text-white flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Prano ofertën
          </button>

          <button
            onClick={handleDecline}
            className="premium-btn bg-red-600 text-white flex items-center gap-2"
          >
            <XCircle size={18} />
            Refuzo ofertën
          </button>

        </div>

      )}

    </div>

  );
}