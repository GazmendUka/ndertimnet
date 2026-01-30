// ===========================================
// src/pages/leads/LeadDetailsPage.jsx
// Lead Details + Unlock + Chat + Workflow
// ===========================================

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import LeadUnlockPanel from "../../components/leads/LeadUnlockPanel";
import LeadChat from "../../components/leads/LeadChat";

import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Euro,
  Clock,
  Phone,
  Mail,
  Workflow,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function LeadDetailsPage() {
  const { id } = useParams(); // leadmatch id
  const navigate = useNavigate();
  const { access, user, isCompany } = useAuth();

  const [lead, setLead] = useState(null);
  const [job, setJob] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [offerCheck, setOfferCheck] = useState(null); // { exists: true/false, offer_id: number|null }


  // ===========================================
  // LOAD LEAD DETAILS (with job + customer data)
  // ===========================================
  async function fetchLead() {
    try {
      setLoading(true);
      const res = await api.get(`leads/leadmatches/${id}/`);

      const data = res.data;
      setLead(data);
      setJob(data.job_request || null);
    } catch (err) {
      console.error("Error fetching lead:", err);
      setError("Nuk mund të ngarkohet lead-i.");
    } finally {
      setLoading(false);
    }
  }

  async function checkOffer(jobId) {
    try {
      const res = await api.get(`offers/check-by-job/${jobId}/`);
      setOfferCheck(res.data);
    } catch (err) {
      console.error("Offer check failed:", err);
    }
  }

  useEffect(() => {
    if (!access) return;

    async function load() {
      await fetchLead();
    }

    load();
  }, [access, id]);

  useEffect(() => {
    if (job?.id) {
      checkOffer(job.id);
    }
  }, [job]);

  const refreshLead = async () => fetchLead();

  // ===========================================
  // GUARDS
  // ===========================================
  if (!user) return <div className="p-6">Duke ngarkuar...</div>;
  if (!isCompany)
    return (
      <div className="p-6 text-red-600 font-semibold">
        Akses i ndaluar.
      </div>
    );

  if (loading) return <p className="text-center mt-10">Po ngarkohet...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!lead) return <p className="text-center mt-10">Lead nuk u gjet.</p>;

  const date = new Date(lead.created_at).toLocaleString("sv-SE");

  // ===========================================
  // STATUS BADGES
  // ===========================================
  const renderWorkflow = () => {
    const map = {
      active: ["Aktiv", "bg-blue-100 text-blue-700"],
      in_progress: ["Në proces", "bg-amber-100 text-amber-700"],
      completed: ["Përfunduar", "bg-green-100 text-green-700"],
      archived: ["Arkivuar", "bg-gray-200 text-gray-700"],
    };
    const [label, classes] = map[lead.workflow_status] || map.active;

    return (
      <span className={`px-3 py-1 rounded-full text-xs ${classes}`}>
        <Workflow size={14} className="inline mr-1" />
        {label}
      </span>
    );
  };

  const renderOfferStatus = () => {
    if (lead.status === "accepted")
      return (
        <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
          <CheckCircle2 size={14} /> Oferta e pranuar
        </span>
      );

    if (lead.status === "declined")
      return (
        <span className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1">
          <XCircle size={14} /> Oferta e refuzuar
        </span>
      );

    return (
      <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
        Në pritje të përgjigjes
      </span>
    );
  };

  return (
    <div className="premium-container mt-4">
      {/* TOP NAV */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/myleads")}
          className="premium-btn btn-light inline-flex items-center"
        >
          <ArrowLeft size={18} /> Kthehu te ofertat
        </button>

        {job && (
          <Link
            to={`/jobrequests/${job.id}`}
            className="premium-btn btn-light"
          >
            Shiko detajet e punës
          </Link>
        )}
      </div>

      {/* HEADER */}
      <h1 className="page-title mb-2">Detajet e lead-it</h1>
      <p className="text-dim mb-4">Shikoni ofertën, bisedën dhe informacionet.</p>

      {/* STATUS BADGES */}
      <div className="flex flex-wrap gap-2 mb-4">
        {renderWorkflow()}
        {renderOfferStatus()}
      </div>

      {/* UNLOCK PANEL */}
      <LeadUnlockPanel lead={lead} refreshLead={refreshLead} />

      {/* JOB INFO */}
      {job && (
        <div className="premium-section mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Briefcase size={18} /> Informacion i punës
          </h2>

          <div className="premium-card p-4 text-gray-700 space-y-2">
            <p>{job.description || "S'ka përshkrim."}</p>
            <p className="flex items-center gap-2">
              <MapPin size={16} /> {job.location}
            </p>
            <p className="flex items-center gap-2">
              <Euro size={16} /> {job.budget ? `${job.budget} €` : "Pa buxhet"}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Clock size={14} /> Krijuar më: {date}
            </p>
          </div>
        </div>
      )}

      {/* CUSTOMER INFO */}
      {lead.customer_info_unlocked && (
        <div className="premium-section mb-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Phone size={18} /> Kontaktet e klientit
          </h2>

          <div className="premium-card p-4 space-y-1">
            <p className="flex items-center gap-2">
              <Phone size={16} /> {lead.customer_phone || "—"}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={16} /> {lead.customer_email || "—"}
            </p>
          </div>
        </div>
      )}

      {/* OFFER MANAGEMENT */}
      <div className="premium-section mb-4">
        <h2 className="text-lg font-semibold mb-3">Menaxhimi i ofertës</h2>

        <div className="premium-card p-4 space-y-3">

          <p className="text-sm text-gray-600">
            Krijoni ose redaktoni ofertën tuaj për këtë punë.
          </p>

          {offerCheck && (
            <>
              {!offerCheck.exists ? (
                <button
                  onClick={() =>
                    navigate(`/company/jobrequests/${job.id}/offer/edit`)
                  }
                  className="premium-btn btn-dark"
                >
                  ➕ Krijo ofertë
                </button>
              ) : (
                <button
                  onClick={() =>
                    navigate(`/company/jobrequests/${job.id}/offer/edit`)
                  }
                  className="premium-btn btn-light"
                >
                  👁 Shiko ofertën
                </button>
              )}
            </>
          )}

        </div>
      </div>

      {/* CHAT */}
      {lead.can_chat ? (
        <LeadChat lead={lead} />
      ) : (
        <p className="text-gray-500 italic mt-6">
          Chat-i do të hapet pasi të blini shërbimin.
        </p>
      )}
    </div>
  );
}
