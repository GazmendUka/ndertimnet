// ===========================================
// src/pages/company/CompanyDashboard.jsx
// FINAL – OFFER-DRIVEN DASHBOARD (RELEASE READY)
// ===========================================

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { Clock4, CheckCircle2, XCircle } from "lucide-react";
import StatusBadge from "../../components/ui/StatusBadge";

export default function CompanyDashboard() {
  const { user, isCompany, access } = useAuth();

  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // ⚠️ leads = OFFERS (namnet behålls för minimal diff)
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // LOAD COMPANY PROFILE
  // ============================================================
  useEffect(() => {
    if (!access) return;

    let alive = true;

    async function fetchCompany() {
      try {
        const res = await api.get("/accounts/profile/company/");
        if (!alive) return;

        setCompany(res.data?.data || res.data || null);
      } catch (err) {
        console.error("Error loading company profile:", err);
        if (alive) setCompany(null);
      } finally {
        if (alive) setCompanyLoading(false);
      }
    }

    fetchCompany();

    return () => {
      alive = false;
    };
  }, [access]);

  // ============================================================
  // PROFILE STEP (soft gating)
  // ============================================================
  const profileStep = useMemo(() => {
    const step = company?.profile_step;
    return Number.isInteger(step) ? step : 0;
  }, [company]);

  const isProfileComplete = profileStep >= 4;

  // ============================================================
  // LOAD OFFERS (SAME SOURCE AS "OFERTAT E MIA")
  // ============================================================
  const lastVisit = useMemo(
    () => localStorage.getItem("lastVisitMyLeads"),
    []
  );

  useEffect(() => {
    if (!access) return;

    let alive = true;

    async function fetchOffers() {
      if (!isProfileComplete) {
        setLeads([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await api.get("/offers/mine/");
        if (!alive) return;

        const list = Array.isArray(res.data) ? res.data : [];
        setLeads(list);
      } catch (err) {
        console.error("Error loading offers:", err);
        if (alive) setLeads([]);
      } finally {
        if (!alive) return;
        localStorage.setItem("lastVisitMyLeads", new Date().toISOString());
        setLoading(false);
      }
    }

    fetchOffers();

    return () => {
      alive = false;
    };
  }, [access, isProfileComplete]);

  // ============================================================
  // STATS (OFFER-DRIVEN)
  // ============================================================
  const stats = useMemo(() => {
    return {
      active: leads.filter((o) =>
        ["draft", "signed"].includes(o.status)
      ).length,

      won: leads.filter((o) => o.status === "accepted").length,

      lost: leads.filter((o) =>
        ["rejected", "declined"].includes(o.status)
      ).length,
    };
  }, [leads]);

  const newLeads = useMemo(() => {
    if (!lastVisit) return [];
    const last = new Date(lastVisit);
    return leads.filter(
      (o) => o?.created_at && new Date(o.created_at) > last
    );
  }, [leads, lastVisit]);

  // ============================================================
  // GUARDS
  // ============================================================
  if (!user) return <div className="p-6">Duke ngarkuar…</div>;

  if (!isCompany) {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Akses i ndaluar. (Vetëm kompanitë)
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="premium-container">

      <Header user={user} stats={stats} newLeads={newLeads.length} />

      {newLeads.length > 0 && <NewLeadNotification count={newLeads.length} />}

      <section className="mt-8">
        <LatestOffers offers={leads} loading={loading} />
      </section>

      <section className="mt-10">
        <OfferInsights offers={leads} />
      </section>
    </div>
  );
}

/* ---------------------------------------------------
   NEW OFFER NOTIFICATION
--------------------------------------------------- */
function NewLeadNotification({ count }) {
  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 text-yellow-900 rounded-lg text-sm font-medium">
      🔔 Keni {count} ofertë të re që nuk e keni parë ende.
    </div>
  );
}

/* ---------------------------------------------------
   HEADER
--------------------------------------------------- */
function Header({ user, stats, newLeads }) {
  return (
    <section className="premium-section">
      <p className="text-label mb-1">Panel i kompanisë</p>

      <div className="flex items-center gap-3">
        <h1 className="page-title">
          Mirësevini, {user.company_name || user.email} 👋
        </h1>

        {newLeads > 0 && (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
            {newLeads} e re 🔔
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Stat label="Aktive" value={stats.active} icon={<Clock4 size={18} />} />
        <Stat label="Të fituara" value={stats.won} icon={<CheckCircle2 size={18} />} />
        <Stat label="Të humbura" value={stats.lost} icon={<XCircle size={18} />} />
      </div>
    </section>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="premium-card p-5 flex justify-between items-center">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="text-gray-400">{icon}</div>
    </div>
  );
}

/* ---------------------------------------------------
   LATEST OFFERS TABLE
--------------------------------------------------- */
function LatestOffers({ offers, loading }) {
  const latest = offers
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <div className="premium-section">
      <div className="flex justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Ofertat e fundit
        </h2>

        <Link
          to="/leads/mine"
          className="text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          Shiko të gjitha
        </Link>
      </div>

      {loading ? (
        <p className="text-dim">Duke ngarkuar…</p>
      ) : latest.length === 0 ? (
        <p className="text-dim">Ende nuk keni dërguar asnjë ofertë.</p>
      ) : (
        <div className="premium-table">
          <table className="w-full text-left text-sm">
            <thead className="premium-thead">
              <tr>
                <Th>Puna</Th>
                <Th>Qyteti</Th>
                <Th>Statusi</Th>
                <Th className="text-right">Detaje</Th>
              </tr>
            </thead>

            <tbody className="divide-y bg-white">
              {latest.map((offer) => {
                const job = offer?.job_request || {};

                return (
                  <tr key={offer.id} className="premium-row">
                    <Td>{job?.title || "—"}</Td>
                    <Td>{job?.city_detail?.name || "—"}</Td>
                    <Td>
                      <StatusBadge status={offer.status} />
                    </Td>
                    <Td className="text-right">
                      <Link
                        to={`/offers/${offer.id}`}
                        className="text-xs font-medium text-gray-700 hover:text-gray-900"
                      >
                        Shiko →
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`premium-cell text-xs font-medium text-gray-500 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`premium-cell ${className}`}>{children}</td>;
}

/* ---------------------------------------------------
   OFFER INSIGHTS
--------------------------------------------------- */
function OfferInsights({ offers }) {
  if (!offers || offers.length === 0) return null;

  const total = offers.length;
  const accepted = offers.filter((o) => o.status === "accepted").length;
  const rejected = offers.filter((o) =>
    ["rejected", "declined"].includes(o.status)
  ).length;

  const acceptanceRate = Math.round((accepted / total) * 100);

  return (
    <div className="premium-section">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        📊 Analizë e ofertave
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="premium-card p-5">
          <p className="text-xs text-gray-500">Totali</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>

        <div className="premium-card p-5">
          <p className="text-xs text-gray-500">Pranuara</p>
          <p className="text-2xl font-bold text-green-600">
            {acceptanceRate}%
          </p>
        </div>

        <div className="premium-card p-5">
          <p className="text-xs text-gray-500">Refuzuara</p>
          <p className="text-2xl font-bold text-red-600">
            {rejected}
          </p>
        </div>
      </div>
    </div>
  );
}
