// src/pages/company/MyLeads.js

import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import EmailVerificationBanner from "../../components/email/EmailVerificationBanner";

import {
  Clock,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function MyLeads() {
  const navigate = useNavigate();
  const { user, isCompany, access } = useAuth();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & sorting
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  // ============================================================
  // FETCH OFFERS
  // ============================================================
  useEffect(() => {
    if (!access || !isCompany) return;

    async function load() {
      try {
        const res = await api.get("offers/mine/");
        setOffers(res.data || []);
      } catch (err) {
        console.error("API ERROR:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [access, isCompany]);

  // ============================================================
  // HELPERS
  // ============================================================
  const timeAgo = (isoDate) => {
    if (!isoDate) return "kohë e panjohur";
    const diff = Date.now() - new Date(isoDate).getTime();
    const min = Math.floor(diff / 60000);
    const hrs = Math.floor(min / 60);
    const days = Math.floor(hrs / 24);

    if (min < 1) return "tani sapo";
    if (min < 60) return `para ${min} minutash`;
    if (hrs < 24) return `para ${hrs} orësh`;
    return `para ${days} ditësh`;
  };

  const getJob = (offer) => offer.job_request || {};
  const getDate = (offer) => offer.created_at;

  const getBudget = (offer) =>
    offer.job_request?.budget ??
    offer.job_request?.cmimi ??
    offer.job_request?.price ??
    null;

  const sorters = {
    newest: (a, b) => new Date(getDate(b)) - new Date(getDate(a)),
    oldest: (a, b) => new Date(getDate(a)) - new Date(getDate(b)),
    budget_high: (a, b) => (getBudget(b) || 0) - (getBudget(a) || 0),
    budget_low: (a, b) => (getBudget(a) || 0) - (getBudget(b) || 0),
  };

  // ============================================================
  // STATUS BADGE
  // ============================================================
  const renderOfferStatus = (offer) => {
    if (offer.status === "accepted")
      return (
        <span className="text-xs inline-flex items-center gap-1 text-green-700">
          <CheckCircle2 size={14} /> Vunnet
        </span>
      );

    if (offer.status === "declined")
      return (
        <span className="text-xs inline-flex items-center gap-1 text-red-600">
          <XCircle size={14} /> Förlorat
        </span>
      );

    return (
      <span className="text-xs inline-flex items-center gap-1 text-gray-500">
        Aktiv offert
      </span>
    );
  };

  // ============================================================
  // FILTER + SORT
  // ============================================================
  const sortedFiltered = useMemo(() => {
    let list = [...offers];

    // AKTIVA = allt som INTE är vunnet eller förlorat
    if (statusFilter === "active")
      list = list.filter(
        (o) => o.status !== "accepted" && o.status !== "declined"
      );

    if (statusFilter === "accepted")
      list = list.filter((o) => o.status === "accepted");

    if (statusFilter === "declined")
      list = list.filter((o) => o.status === "declined");

    return list.sort(sorters[sortOption]);
  }, [offers, statusFilter, sortOption]);


  // ============================================================
  // GUARDS
  // ============================================================
  if (!user) return <div className="p-6">Duke ngarkuar...</div>;
  if (!isCompany)
    return (
      <div className="p-6 text-red-600 font-semibold">
        Akses i ndaluar. (Vetëm kompanitë mund ta shohin këtë faqe)
      </div>
    );

  if (loading)
    return <div className="p-6">Duke ngarkuar ofertat...</div>;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="premium-container mt-4">
      {!user.email_verified && <EmailVerificationBanner />}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/dashboard/company")}
          className="premium-btn btn-light inline-flex items-center"
        >
          <ArrowLeft size={18} />
          Kthehu te Dashboard
        </button>
      </div>

      <h1 className="page-title mb-4">Oferta e mia 💼</h1>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6">
        <div className="inline-flex rounded-full border bg-white overflow-hidden">
          {["all", "active", "accepted", "declined"].map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-1.5 text-sm rounded-full ${
                statusFilter === key
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {key === "all" && "Të gjitha"}
              {key === "active" && "Aktive"}
              {key === "accepted" && "Fitues"}
              {key === "declined" && "Humbës"}
            </button>
          ))}
        </div>

        <div className="text-sm flex items-center gap-2">
          <span className="text-gray-500">Rendit sipas:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border rounded-lg px-3 py-1.5"
          >
            <option value="newest">Më të rejat</option>
            <option value="oldest">Më të vjetrat</option>
            <option value="budget_high">Buxheti më i lartë</option>
            <option value="budget_low">Buxheti më i ulët</option>
          </select>
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {sortedFiltered.map((offer) => {
          const job = getJob(offer);
          
          return (
            <div
              key={offer.id}
              className="premium-card p-4 flex flex-col md:flex-row md:justify-between gap-4 border border-gray-100"
            >
              {/* LEFT */}
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase size={16} />
                  {job.title || "Pa titull"}
                </h3>

                <p className="text-sm text-gray-600">
                  {job.city_detail?.name || "Pa qytet"} •{" "}
                  {job.budget ? `${job.budget} €` : "Pa buxhet"}
                </p>

                <p className="text-xs text-gray-400 italic flex items-center gap-1 mt-1">
                  <Clock size={12} /> Përditësuar {timeAgo(offer.created_at)}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {renderOfferStatus(offer)}
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col items-start md:items-end gap-2 min-w-[220px]">
                <Link
                  to={`/offers/${offer.id}`}
                  className="premium-btn btn-light inline-flex items-center gap-1 mt-2"
                >
                  Shiko ofertën
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
