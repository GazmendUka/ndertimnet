// src/pages/customer/CustomerDashboard.jsx

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

// Icons
import { FileText, PlusCircle, CheckCircle2, Clock4 } from "lucide-react";

// UI components
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";

export default function CustomerDashboard() {
  const { user, access, isCustomer } = useAuth();


  const [stats, setStats] = useState({ total: "—", active: "—", closed: "—" });
  const [latestJobs, setLatestJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // LOAD JOB REQUESTS – only the logged-in customer's jobs
  // ============================================================
  useEffect(() => {
    if (!access) {
      setLoading(false);
      return;
    }

    async function fetchJobs() {
      try {
        const res = await api.get("jobrequests/?mine=1");

        const list = res.data.results || res.data || [];
        const jobs = Array.isArray(list) ? list : [];

        const total = jobs.length;
        const active = jobs.filter((j) => j.is_active).length;
        const closed = total - active;

        setStats({ total, active, closed });

        setLatestJobs(
          jobs
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
        );
      } catch (err) {
        console.warn("Kunde inte hämta job requests:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [access]);

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
            value={stats.total}
            icon={<FileText size={18} />}
          />
          <StatCard
            label="Kërkesa aktive"
            value={stats.active}
            icon={<Clock4 size={18} />}
          />
          <StatCard
            label="Kërkesa të mbyllura"
            value={stats.closed}
            icon={<CheckCircle2 size={18} />}
          />
        </section>

        <MainContent latestJobs={latestJobs} loading={loading} />
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
        <Link to="/jobrequests/create" className="premium-btn btn-dark">
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

        <Link
          to="/jobrequests"
          className="text-xs font-medium text-gray-500 hover:text-gray-900"
        >
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
            <tr key={job.id} className="premium-row">
              <Td>{job.title || "—"}</Td>
              <Td>{job.location || "—"}</Td>
              <Td>
                <StatusBadge active={job.is_active} />
              </Td>
              <Td className="text-right">
                <Link
                  to={`/jobrequests/${job.id}`}
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
        <Link to="/jobrequests/create" className="premium-btn btn-light">
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
