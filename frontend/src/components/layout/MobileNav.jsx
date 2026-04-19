// src/components/layout/MobileNav.jsx

import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import api from "../../api/axios";

import {
  Home,
  User,
  Briefcase,
  FileText,
  Plus,
} from "lucide-react";

export default function MobileNav() {
  const { isCustomer, isCompany } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [newLeadsCount, setNewLeadsCount] = useState(0);

  const path = location.pathname;

  // ============================================================
  // ✅ SMART ACTIVE
  // ============================================================
  const isActive = (p) => {
    if (p === "/customer" || p === "/company") {
      return path === p;
    }
    return path.startsWith(p);
  };

  // ============================================================
  // 🔥 SMART FAB LOGIC
  // ============================================================
  const getFabConfig = () => {
    // =====================
    // CUSTOMER
    // =====================
    if (isCustomer) {
      if (path === "/customer") {
        return {
          show: true,
          action: () => navigate("/customer/jobrequests/create"),
        };
      }

      if (path === "/customer/jobrequests") {
        return {
          show: true,
          action: () => navigate("/customer/jobrequests/create"),
        };
      }

      if (path.startsWith("/customer/jobrequests/")) {
        return { show: false };
      }

      if (path === "/customer/profile") {
        return { show: false };
      }

      return { show: true, action: () => navigate("/customer/jobrequests/create") };
    }

    // =====================
    // COMPANY
    // =====================
    if (isCompany) {
      if (path === "/company") {
        return {
          show: true,
          action: () => navigate("/company/jobrequests"),
        };
      }

      if (path === "/company/jobrequests") {
        return {
          show: true,
          action: () => navigate("/company/jobrequests"),
        };
      }

      if (path.startsWith("/company/jobrequests/")) {
        return { show: false };
      }

      if (path.startsWith("/company/leads")) {
        return { show: false };
      }

      if (path === "/company/profile") {
        return { show: false };
      }

      return { show: true, action: () => navigate("/company/jobrequests") };
    }

    return { show: false };
  };

  const fab = getFabConfig();

  // ============================================================
  // 🔥 FETCH NEW LEADS
  // ============================================================
  useEffect(() => {
    if (!isCompany) return;

    const fetchLeads = async () => {
      try {
        const res = await api.get("/jobrequests/");
        const jobs = res.data || [];

        const lastVisit = localStorage.getItem("lastVisitJobRequests");

        let newCount = 0;

        if (lastVisit) {
          newCount = jobs.filter(
            (job) =>
              job.created_at &&
              new Date(job.created_at) > new Date(lastVisit)
          ).length;
        }

        setNewLeadsCount(newCount);
      } catch (err) {
        console.error("Error fetching leads:", err);
      }
    };

    fetchLeads();
  }, [isCompany]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="lg:hidden fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        className="
          pointer-events-auto
          w-[95%] max-w-md
          bg-white/95 backdrop-blur-xl
          border border-gray-200
          shadow-xl
          rounded-2xl
          px-2 py-2
        "
      >
        <div className="flex items-center justify-around relative">

          {/* CUSTOMER */}
          {isCustomer && (
            <>
              <MobileItem
                icon={<Home size={20} />}
                label="Home"
                to="/customer"
                active={isActive("/customer")}
              />

              <MobileItem
                icon={<FileText size={20} />}
                label="Kërkesat"
                to="/customer/jobrequests"
                active={isActive("/customer/jobrequests")}
              />

              {fab.show && <FabButton onClick={fab.action} />}

              <MobileItem
                icon={<User size={20} />}
                label="Profil"
                to="/customer/profile"
                active={isActive("/customer/profile")}
              />
            </>
          )}

          {/* COMPANY */}
          {isCompany && (
            <>
              <MobileItem
                icon={<Home size={20} />}
                label="Home"
                to="/company"
                active={isActive("/company")}
              />

              <MobileItem
                icon={<Briefcase size={20} />}
                label="Jobb"
                to="/company/jobrequests"
                active={isActive("/company/jobrequests")}
              />

              {fab.show && <FabButton onClick={fab.action} />}

              <MobileItem
                icon={<FileText size={20} />}
                label="Leads"
                to="/company/leads/mine"
                active={isActive("/company/leads")}
                badge={newLeadsCount}
                onClick={() => {
                  localStorage.setItem(
                    "lastVisitJobRequests",
                    new Date().toISOString()
                  );
                  setNewLeadsCount(0);
                }}
              />

              <MobileItem
                icon={<User size={20} />}
                label="Profil"
                to="/company/profile"
                active={isActive("/company/profile")}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🔥 MOBILE ITEM
// ============================================================
function MobileItem({ to, icon, label, active, badge, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="relative flex flex-col items-center justify-center flex-1 py-2"
    >
      <div
        className={`
          absolute inset-1 rounded-xl transition-all duration-300
          ${active ? "bg-gray-900/10 scale-100" : "scale-90 opacity-0"}
        `}
      />

      <div className="relative">
        <span
          className={`
            relative z-10 transition-all duration-200
            ${active ? "text-gray-900 scale-110" : "text-gray-400"}
          `}
        >
          {icon}
        </span>

        {badge > 0 && (
          <span
            className="
              absolute -top-1 -right-2
              bg-red-500 text-white
              text-[10px] px-1.5 py-[1px]
              rounded-full
              font-semibold
            "
          >
            {badge}
          </span>
        )}
      </div>

      <span
        className={`
          text-[11px] mt-1
          ${active ? "text-gray-900" : "text-gray-400"}
        `}
      >
        {label}
      </span>
    </Link>
  );
}

// ============================================================
// 🚀 FAB BUTTON
// ============================================================
function FabButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        absolute left-1/2 -translate-x-1/2 -top-6
        w-14 h-14
        rounded-full
        bg-gray-900 text-white
        flex items-center justify-center
        shadow-xl
        border-4 border-white
        active:scale-95
        transition
      "
    >
      <Plus size={22} />
    </button>
  );
}