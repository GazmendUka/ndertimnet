// ============================================================
// src/components/layout/Sidebar.jsx
// ============================================================
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import api from "../../api/axios";

import { Home, User, LogOut, Briefcase, FileText } from "lucide-react";

export default function Sidebar() {
  const { user, logout, isCompany, isCustomer, access } = useAuth();
  const navigate = useNavigate();

  const [newLeadsCount, setNewLeadsCount] = useState(0);

  // ============================================================
  // LOAD NEW LEADS COUNT (ONLY FOR COMPANY)
  // ============================================================
  useEffect(() => {
    if (!isCompany || !access) return;

    async function fetchNewLeads() {
      try {
        const res = await api.get("leads/leadmatches/?status=pending", {
          headers: { Authorization: `Bearer ${access}` }
        });

        const list = res.data.results || res.data || [];
        const safeList = Array.isArray(list) ? list : [];

        const lastVisit = localStorage.getItem("lastVisitMyLeads");

        if (!lastVisit) {
          setNewLeadsCount(0);
          return;
        }

        const count = safeList.filter(
          (lead) => new Date(lead.created_at) > new Date(lastVisit)
        ).length;

        setNewLeadsCount(count);
      } catch (err) {
        console.error("Error loading leads in sidebar:", err);
      }
    }


    fetchNewLeads();
  }, [isCompany, access]);

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside
      className="
        hidden lg:flex
        w-64 premium-card border-r border-gray-200 
        pt-8 pb-6 px-6 flex-col
      "
    >
      {/* LOGO */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          NdertimNet
        </h1>

        <p className="text-sm text-gray-400 mt-1">
          {user?.role === "company" ? "Panel i kompanisë" : "Panel i klientit"}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 mb-6" />

      {/* MENU */}
      <nav className="flex-1 space-y-1">

        {/* CUSTOMER MENU */}
        {isCustomer && (
          <>
            <SidebarLink to="/dashboard/customer" icon={<Home size={18} />} text="Dashboard" />
            <SidebarLink to="/jobrequests" icon={<FileText size={18} />} text="Kërkesat e mia" />
            <SidebarLink to="/profile/customer" icon={<User size={18} />} text="Profili" />
          </>
        )}

        {/* COMPANY MENU */}
        {isCompany && (
          <>
            <SidebarLink to="/dashboard/company" icon={<Home size={18} />} text="Dashboard" />
            <SidebarLink to="/jobrequests" icon={<Briefcase size={18} />} text="Kërkesat e punës" />

            {/* OFERTAT E MIA + BADGE */}
            <SidebarLink
              to="/leads/mine"
              icon={<FileText size={18} />}
              text="Ofertat e mia"
              badge={newLeadsCount}
            />

            <SidebarLink to="/profile/company" icon={<User size={18} />} text="Profili" />
          </>
        )}
      </nav>

      {/* LOGOUT */}
      <button
        onClick={handleLogout}
        className="
          flex items-center gap-3 
          p-3 mt-6 rounded-lg 
          text-red-600 hover:bg-red-50 transition
        "
      >
        <LogOut size={18} />
        Dil
      </button>
    </aside>
  );
}


// ============================================================
// SIDEBAR LINK COMPONENT
// ============================================================
function SidebarLink({ to, icon, text, badge }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link
      to={to}
      className={`
        flex items-center justify-between
        p-3 rounded-lg transition
        ${active 
          ? "bg-gray-100 text-gray-900 font-medium shadow-sm" 
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <span className={`text-gray-500 ${active && "text-gray-900"}`}>
          {icon}
        </span>
        <span className="text-sm font-medium">{text}</span>
      </div>

      {/* BADGE */}
      {badge > 0 && (
        <span
          className="
            text-xs font-semibold
            bg-yellow-100 text-yellow-800 
            border border-yellow-300
            px-2 py-0.5 rounded-full
          "
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
