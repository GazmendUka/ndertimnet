import jobCategory from "../../utils/jobCategory";
// src/pages/jobrequests/JobRequestList.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import { ArrowLeft, MapPin, Euro, Tag, Briefcase, Lock } from "lucide-react";
import StatusBadge from "../../components/ui/StatusBadge";
import JobStatusBadge from "../../components/ui/JobStatusBadge";
import OfferIntroduction from "../../components/payments/OfferIntroduction";

export default function JobRequestList() {
  const { user, access, isCompany, isCustomer } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: false, previous: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [cities, setCities] = useState([]);
  const [professions, setProfessions] = useState([]);
  const city = searchParams.get("city") || "";
  const profession = searchParams.get("profession") || "";
  const recommended = searchParams.get("recommended") === "1";
  useEffect(() => {
    if (!isCompany) return;
    let active = true;
    Promise.all([api.get("locations/cities/"), api.get("taxonomy/professions/")])
      .then(([c, p]) => { if (active) { setCities(c.data.results || c.data); setProfessions(p.data.results || p.data); } })
      .catch(() => { /* The list remains usable without lookup filters. */ });
    return () => { active = false; };
  }, [isCompany]);
  function filter(name, value) {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    if (value) params.set(name, value); else params.delete(name);
    setSearchParams(params);
  }

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

      setCompanyLoading(true);
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
  const canAccessMarketplace =
    company?.can_access_marketplace === true;

  const uiLocked =
    isCompany &&
    !companyLoading &&
    !canAccessMarketplace;
  const waitingForCompany = isCompany && companyLoading;

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
    let cancelled = false;
    setRequests([]);
    setPagination({ count: 0, next: false, previous: false });
    setError(false);
    if (!access || waitingForCompany || uiLocked) {
      setLoading(Boolean(access && waitingForCompany));
      return;
    }
    setLoading(true);

    async function fetchRequests() {
      try {
        const endpoint = isCustomer
          ? `jobrequests/?mine=1&page=${page}`
          : `jobrequests/?without_my_offer=1&page=${page}${city ? `&city=${encodeURIComponent(city)}` : ""}${profession ? `&profession=${encodeURIComponent(profession)}` : ""}${recommended ? "&recommended=1" : ""}`;

        const res = await api.get(endpoint);
        if (!Array.isArray(res.data?.results)) throw new Error("Invalid job list");
        if (cancelled) return;
        setRequests(res.data.results);
        setPagination({ count: res.data.count, next: Boolean(res.data.next), previous: Boolean(res.data.previous) });
        try { localStorage.setItem("lastVisitJobRequests", new Date().toISOString()); } catch { /* Storage may be disabled. */ }

      } catch (err) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRequests();
    return () => { cancelled = true; };
  }, [access, isCustomer, waitingForCompany, uiLocked, page, retry, city, profession, recommended]);

  function goToPage(nextPage) {
    const params = new URLSearchParams(searchParams);
    if (nextPage === 1) params.delete("page");
    else params.set("page", String(nextPage));
    setSearchParams(params);
  }



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
      {isCompany && canAccessMarketplace && (
        <OfferIntroduction key={user.id} userId={user.id} />
      )}

      {/* Back */}
      <button
        onClick={() => navigate(dashboardPath)}
        className="premium-btn btn-light mb-6 inline-flex items-center"
      >
        <ArrowLeft size={18} />
        Kthehu te dashboard
      </button>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title mb-3">
            Kërkesat e punës
          </h1>

          <p className="text-dim">
            {isCompany
              ? "Shikoni kërkesat aktuale dhe dërgoni ofertat tuaja."
              : "Këtu janë të gjitha kërkesat tuaja."}
          </p>
        </div>

        {isCustomer && (
          <Link
            to="/customer/jobrequests/create"
            className="
              hidden md:inline-flex
              sticky
              top-6
              premium-btn
              btn-dark
              items-center
              gap-2
              whitespace-nowrap
            "
          >
            + Krijo kërkesë
          </Link>
        )}
      </div>

      {/* LIST */}
      {isCompany && !uiLocked && <section aria-label="Filtro kërkesat" className="premium-card p-4 mb-6 flex flex-wrap gap-4">
        <label>Qyteti<select className="block border rounded p-2 max-w-full" value={city} onChange={e => filter("city", e.target.value)}><option value="">Të gjitha qytetet</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Shërbimi<select className="block border rounded p-2 max-w-full" value={profession} onChange={e => filter("profession", e.target.value)}><option value="">Të gjitha shërbimet</option>{professions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={recommended} onChange={e => filter("recommended", e.target.checked ? "1" : "")} />Për zonat dhe specialitetet e profilit tim</label>
        <button className="premium-btn btn-light" onClick={() => setSearchParams({})}>Pastro filtrat</button>
      </section>}
      {!uiLocked && loading && <p role="status" className="text-dim mb-4">Duke ngarkuar kërkesat...</p>}
      {!uiLocked && error && (
        <div role="alert" className="premium-card p-5 mb-4">
          <p>Nuk mund të ngarkoheshin kërkesat. Provoni përsëri.</p>
          <button className="premium-btn btn-light mt-3" onClick={() => setRetry(value => value + 1)}>Provo përsëri</button>
          {page > 1 && <button className="premium-btn btn-light mt-3 ml-2" onClick={() => goToPage(1)}>Kthehu te faqja e parë</button>}
        </div>
      )}
      {!uiLocked && !loading && !error && requests.length === 0 && (
        <p className="text-dim mb-4">{isCustomer ? "Ende nuk keni krijuar asnjë kërkesë pune." : "Nuk ka kërkesa të reja pune për momentin."}</p>
      )}
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
                      {isCustomer ? (
                        <JobStatusBadge job={req} />
                      ) : (
                        <StatusBadge active={req.is_active} />
                      )}
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
                        {jobCategory(req)}
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
                      to="/company/profile"
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
      {!uiLocked && !loading && !error && pagination.count > 0 && (
        <nav aria-label="Faqet e kërkesave" className="flex flex-wrap items-center justify-between gap-3 mt-6">
          <button className="premium-btn btn-light disabled:opacity-50" disabled={!pagination.previous} onClick={() => goToPage(page - 1)}>E mëparshme</button>
          <p role="status" className="text-sm text-gray-600">Faqja {page} nga {Math.ceil(pagination.count / 10)} · {pagination.count} kërkesa</p>
          <button className="premium-btn btn-light disabled:opacity-50" disabled={!pagination.next} onClick={() => goToPage(page + 1)}>Tjetra</button>
        </nav>
      )}
    </div>
  );
}
