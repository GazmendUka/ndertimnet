// src/pages/customer/CustomerDashboard.jsx

import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { Link, useNavigate } from "react-router-dom";

// Icons
import { FileText, PlusCircle, CheckCircle2, Clock4 } from "lucide-react";

// UI components
import StatCard from "../../components/ui/StatCard";
import JobStatusBadge from "../../components/ui/JobStatusBadge";

const jobRequestsPath = "/customer/jobrequests";
const createJobPath = "/customer/jobrequests/create";

export default function CustomerDashboard() {
  const { user, access, isCustomer } = useAuth();


  const [stats, setStats] = useState(null);
  const [latestJobs, setLatestJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);



  // ============================================================
  // LOAD JOB REQUESTS – only the logged-in customer's jobs
  // ============================================================
  useEffect(() => {
    let cancelled = false;
    setStats(null);
    setLatestJobs([]);
    if (!access || !isCustomer) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);

    async function fetchJobs() {
      try {
        const { data } = await api.get("jobrequests/summary/");
        if (!data?.stats || !Array.isArray(data.latest_jobs)) throw new Error("Invalid summary");
        if (cancelled) return;
        setStats(data.stats);
        setLatestJobs(data.latest_jobs);
      } catch (err) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJobs();
    return () => { cancelled = true; };
  }, [access, isCustomer, retry]);

  // ============================================================
  // GUARDS
  // ============================================================
  if (!user) return <div className="p-6">Duke ngarkuar panelin...</div>;

  if (!isCustomer)
    return (
      <div className="p-6 text-red-600 font-semibold">
        Akses i ndaluar. (Vetëm klientët mund ta shohin këtë faqe)
      </div>
    );

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="min-h-screen">
      <div className="premium-container">
        <Header user={user} />

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            label="Kërkesat gjithsej"
            value={stats?.total ?? "—"}
            icon={<FileText size={18} />}
          />
          <StatCard
            label="Kërkesa aktive"
            value={stats?.active ?? "—"}
            icon={<Clock4 size={18} />}
          />
          <StatCard
            label="Punë në proces"
            value={stats?.in_progress ?? "—"}
            icon={<Clock4 size={18} />}
          />
          <StatCard
            label="Punë të përfunduara"
            value={stats?.completed ?? "—"}
            icon={<CheckCircle2 size={18} />}
          />
          <StatCard label="Kërkesa të papublikuara" value={stats?.unpublished ?? "—"} icon={<FileText size={18} />} />
          <StatCard label="Kërkesa të mbyllura / anuluara" value={stats?.closed ?? "—"} icon={<FileText size={18} />} />
        </section>

        {error ? (
          <div role="alert" className="premium-section">
            <p>Nuk mund të ngarkoheshin kërkesat. Provoni përsëri.</p>
            <button className="premium-btn btn-light mt-3" onClick={() => setRetry(value => value + 1)}>Provo përsëri</button>
          </div>
        ) : <MainContent latestJobs={latestJobs} loading={loading} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   Header Component
--------------------------------------------------- */
function Header({ user }) {
  return (
    <section className="premium-section">
      <p className="text-label mb-1">Panel i klientit</p>

      <h1 className="page-title">
        Përshëndetje, {user.first_name || user.email.split("@")[0]} 👋
      </h1>

      <p className="text-dim mt-2">
        Menaxhoni kërkesat tuaja të punës dhe shikoni ofertat nga kompanitë.
      </p>

      <div className="mt-6">
        <Link to={createJobPath} className="premium-btn btn-dark">
          <PlusCircle size={18} />
          Krijo kërkesë të re
        </Link>
      </div>
    </section>
  );
}

/* ---------------------------------------------------
   Main Content
--------------------------------------------------- */
function MainContent({ latestJobs, loading }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <div className="lg:col-span-2">
        <LatestRequests latestJobs={latestJobs} loading={loading} />
      </div>
      <RightSidebar />
    </section>
  );
}

/* ---------------------------------------------------
   Latest Requests
--------------------------------------------------- */
function LatestRequests({ latestJobs, loading }) {
  return (
    <div className="premium-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
          Kërkesat e fundit
        </h2>

        <Link to={jobRequestsPath} className="text-xs font-medium text-gray-500 hover:text-gray-900">
          Shiko të gjitha
        </Link>
      </div>

      {loading ? (
        <p className="text-dim">Duke ngarkuar...</p>
      ) : latestJobs.length === 0 ? (
        <p className="text-dim">Ende nuk keni krijuar asnjë kërkesë pune.</p>
      ) : (
        <RequestsTable latestJobs={latestJobs} />
      )}
    </div>
  );
}

/* ---------------------------------------------------
   Table
--------------------------------------------------- */
function RequestsTable({ latestJobs }) {
  const navigate = useNavigate();
  return (
    <div className="premium-table">
      <table className="w-full text-left text-sm">
        <thead className="premium-thead">
          <tr>
            <Th>Titulli</Th>
            <Th>Lokacioni</Th>
            <Th>Statusi</Th>
            <Th className="text-right">Detaje</Th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 bg-white">
          {latestJobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => navigate(`/customer/jobrequests/${job.id}`)}
              className="premium-row cursor-pointer hover:bg-gray-50 transition"
            >
              <Td>{job.title || "—"}</Td>
              <Td>{job.city_detail?.name || "Pa qytet"}</Td>
              <Td>
                <JobStatusBadge job={job} />
              </Td>
              <Td className="text-right">
                <Link
                  onClick={(e) => e.stopPropagation()}
                  to={`/customer/jobrequests/${job.id}`}
                  className="text-xs font-medium text-gray-700 hover:text-gray-900"
                >
                  Shiko
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------
   Right Sidebar
--------------------------------------------------- */
function RightSidebar() {
  return (
    <div className="space-y-6">
      <div className="premium-section">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Si funksionon?</h3>
        <ul className="text-dim space-y-2">
          <li>• Krijoni një kërkesë pune me detajet tuaja.</li>
          <li>• Kompanitë e interesuara dërgojnë ofertat.</li>
          <li>• Ju zgjidhni ofertën më të mirë.</li>
        </ul>
      </div>

      <div className="premium-card p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <h3 className="text-sm font-semibold mb-2">Keni një projekt të ri?</h3>
        <p className="text-sm text-gray-200 mb-4">
          Sa më shumë detaje shtoni, aq më të sakta do të jenë ofertat.
        </p>
        <Link to={createJobPath} className="premium-btn btn-light">
          <PlusCircle size={16} />
          Krijo kërkesë të re
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------------------------------
   Generic table cells
--------------------------------------------------- */
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
