// src/pages/jobrequests/JobRequestList.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import { ArrowLeft, MapPin, Euro, Tag, Briefcase, Lock } from "lucide-react";
import StatusBadge from "../../components/ui/StatusBadge";

export default function JobRequestList() {
  const { user, access, isCompany, isCustomer } = useAuth();
  const navigate = useNavigate();

  console.log("ACCESS:", access);
  console.log("ROLE:", user?.role);
  console.log("isCustomer:", isCustomer);

  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  const [requests, setRequests] = useState([]);

  // ============================================================
  // LOAD COMPANY (same as dashboard)
  // ============================================================
  useEffect(() => {
    let isMounted = true;

    async function fetchCompany() {
      if (!access || !isCompany) {
        if (isMounted) setCompanyLoading(false);
        return;
      }

      try {
        const res = await api.get("accounts/profile/company/");
        if (isMounted) setCompany(res.data?.data || res.data || null);
      } catch {
        if (isMounted) setCompany(null);
      } finally {
        if (isMounted) setCompanyLoading(false);
      }
    }

    fetchCompany();
    return () => (isMounted = false);
  }, [access, isCompany]);

  // ============================================================
  // SOURCE OF TRUTH
  // ============================================================
  const profileStep = useMemo(() => {
    const step = company?.profile_step;
    return Number.isInteger(step) ? step : 0;
  }, [company]);

  const isProfileComplete = profileStep >= 4;
  const uiLocked = isCompany && !companyLoading && !isProfileComplete;

  // ============================================================
  // PREMIUM PLACEHOLDERS
  // ============================================================
  const placeholderRequests = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: `placeholder-${i}`,
      __placeholder: true,
    }));
  }, []);

  // ============================================================
  // LOAD JOB REQUESTS
  // ============================================================
  useEffect(() => {
    if (!access) return;   // 🔥 VIKTIGT

    async function fetchRequests() {
      if (uiLocked) {
        setRequests([]);
        return;
      }

      try {
        const endpoint = isCustomer
          ? "jobrequests/?mine=1"
          : "jobrequests/";

        const res = await api.get(endpoint);

        const list = Array.isArray(res.data?.results)
          ? res.data.results
          : Array.isArray(res.data)
          ? res.data
          : [];

        const filtered = isCompany
          ? list.filter((req) => !req.has_offer)
          : list;

        setRequests(filtered);
      } catch (err) {
        console.error("Error fetching jobrequests:", err);
      }
    }

    fetchRequests();
  }, [access, isCustomer, isCompany, uiLocked]);



  // ============================================================
  // GUARDS
  // ============================================================
  if (!user) return <div className="p-6">Duke ngarkuar...</div>;

  const displayRequests = uiLocked ? placeholderRequests : requests;

  const dashboardPath = isCustomer
  ? "/customer"
  : isCompany
  ? "/company"
  : "/";

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="premium-container">

      {/* Back */}
      <button
        onClick={() => navigate(dashboardPath)}
        className="premium-btn btn-light mb-6 inline-flex items-center"
      >
        <ArrowLeft size={18} />
        Kthehu te dashboard
      </button>

      <h1 className="page-title mb-4">Kërkesat e punës</h1>

      <p className="text-dim mb-8">
        {isCompany
          ? "Shikoni kërkesat aktuale dhe dërgoni ofertat tuaja."
          : "Këtu janë të gjitha kërkesat tuaja."}
      </p>

      {/* LIST */}
      <div className="space-y-5">
        {displayRequests.map((req) => {
          const isPlaceholder = !!req.__placeholder;

          return (
            <div
              key={req.id}
              className="relative premium-card p-5 overflow-hidden"
            >
              <div
                className={
                  uiLocked
                    ? "blur-sm pointer-events-none select-none"
                    : ""
                }
              >
                {isPlaceholder ? (
                  /* =================== SKELETON =================== */
                  <div className="space-y-3">
                    <div className="skeleton h-5 w-1/2" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-2/3" />

                    <div className="flex gap-4 mt-3">
                      <div className="skeleton h-4 w-24" />
                      <div className="skeleton h-4 w-20" />
                      <div className="skeleton h-4 w-24" />
                    </div>

                    <div className="skeleton h-9 w-32 mt-4 rounded-lg" />
                  </div>
                ) : (
                  /* =================== REAL DATA =================== */
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-lg font-semibold">
                        {req.title}
                      </h2>
                      <StatusBadge active={req.is_active} />
                    </div>

                    {isCompany && req.customer && !req.has_offer && (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 mt-1">
                        🔓 Upplåst – ingen offert skickad
                      </span>
                    )}

                    <p className="text-gray-600 mb-3">
                      {req.description || "Nuk ka përshkrim."}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {req.city_detail?.name || "Pa qytet"}
                      </span>

                      <span className="flex items-center gap-1">
                        <Euro size={14} />
                        {req.budget
                          ? `${req.budget} €`
                          : "Pa buxhet"}
                      </span>

                      <span className="flex items-center gap-1">
                        <Tag size={14} />
                        {req.profession_detail?.name ||
                          "Pa profesion"}
                      </span>
                    </div>

                    {isCompany ? (
                      <Link
                        to={`/company/jobrequests/${req.id}`}
                        className="premium-btn btn-dark inline-flex items-center"
                      >
                        <Briefcase size={16} /> Dërgo ofertë
                      </Link>
                    ) : (
                      <Link
                        to={`/customer/jobrequests/${req.id}`}
                        className="premium-btn btn-light inline-flex items-center"
                      >
                        Shiko detajet
                      </Link>
                    )}
                  </>
                )}
              </div>

              {/* OVERLAY */}
              {uiLocked && (
                <div className="absolute inset-0 bg-white/55 flex items-center justify-center">
                  <div className="text-center px-4">
                    <Lock
                      size={28}
                      className="mx-auto text-gray-800"
                    />
                    <p className="text-sm font-semibold mt-2">
                      Këtu do të shfaqen kërkesat reale
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      Plotësoni profilin për t’i parë dhe për të
                      dërguar oferta.
                    </p>

                    <Link
                      to="/profile/company"
                      className="inline-block mt-3 text-sm font-medium text-gray-900 underline"
                    >
                      Plotëso profilin →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


