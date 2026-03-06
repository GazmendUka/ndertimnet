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

  const { id } = useParams(); // Offer ID
  const navigate = useNavigate();
  const { access, user, isCustomer } = useAuth();

  const [offer, setOffer] = useState(null);
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [version, setVersion] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ===========================================
  // LOAD OFFER
  // ===========================================
  async function fetchOffer() {

    try {

      setLoading(true);

      const res = await api.get(`offers/${id}/`);
      const data = res.data;

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
  }

  useEffect(() => {
    if (access) fetchOffer();
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
  if (!user) return <div className="p-6">Duke ngarkuar…</div>;

  if (!isCustomer) {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Akses i ndaluar. (Vetëm klientët mund ta shohin këtë faqe)
      </div>
    );
  }

  if (loading) return <p className="text-center mt-10">Po ngarkohet…</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!offer) return <p className="text-center mt-10">Oferta nuk u gjet.</p>;

  const createdDate = new Date(offer.created_at).toLocaleString("sv-SE");

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

        {job && (
          <Link
            to={`/jobrequests/${job.id}`}
            className="premium-btn btn-light"
          >
            Shiko kërkesën
          </Link>
        )}

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
              {company.company_name}
            </p>

            <p>📞 {company.phone}</p>
            <p>📧 {company.user?.email}</p>

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

            <p>{job.description}</p>

            <p className="flex items-center gap-2">
              <MapPin size={16} />
              {job.city_detail?.name || job.location}
            </p>

            <p className="flex items-center gap-2">
              <Euro size={16} />
              {job.budget ? `${job.budget} €` : "Pa buxhet"}
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

            {version.presentation_text && (
              <p className="whitespace-pre-line">
                {version.presentation_text}
              </p>
            )}

            <p className="text-lg font-bold">
              💶 {version.price_amount} {version.currency || "EUR"}
            </p>

            {version.duration_text && (
              <p className="text-sm text-gray-600">
                Afati: {version.duration_text}
              </p>
            )}

          </div>

        </div>

      )}

      {/* ACTIONS */}
      {offer.status === "signed" && (

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