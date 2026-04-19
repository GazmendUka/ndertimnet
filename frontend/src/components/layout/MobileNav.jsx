// src/components/layout/MobileNav.jsx

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

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

  // ✅ SMART ACTIVE (din version)
  const isActive = (path) => {
    if (path === "/customer" || path === "/company") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // 🚀 FAB ACTION
  const handleCreate = () => {
    if (isCustomer) {
      navigate("/customer/jobrequests/create");
    } else if (isCompany) {
      navigate("/company/jobrequests");
    }
  };

  return (
    <div className="lg:hidden fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">

      {/* CONTAINER */}
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

          {/* =======================
              CUSTOMER NAV
          ======================= */}
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

              {/* 🔥 FAB */}
              <FabButton onClick={handleCreate} />

              <MobileItem
                icon={<User size={20} />}
                label="Profil"
                to="/customer/profile"
                active={isActive("/customer/profile")}
              />
            </>
          )}

          {/* =======================
              COMPANY NAV
          ======================= */}
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

              {/* 🔥 FAB */}
              <FabButton onClick={handleCreate} />

              <MobileItem
                icon={<FileText size={20} />}
                label="Leads"
                to="/company/leads/mine"
                active={isActive("/company/leads")}
                badge={false} // 🔴 TEST (koppla senare dynamiskt)
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

//
// ===============================
// 🔥 PREMIUM ITEM (V3)
// ===============================
//
function MobileItem({ to, icon, label, active, badge }) {
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center justify-center flex-1 py-2"
    >
      {/* 🔥 ACTIVE PILL */}
      <div
        className={`
          absolute inset-1 rounded-xl transition-all duration-300
          ${
            active
              ? "bg-gray-900/10 scale-100"
              : "scale-90 opacity-0"
          }
        `}
      />

      {/* ICON */}
      <div className="relative">
        <span
          className={`
            relative z-10 transition-all duration-200
            ${active ? "text-gray-900 scale-110" : "text-gray-400"}
          `}
        >
          {icon}
        </span>

        {/* 🔴 BADGE */}
        {badge && (
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

      {/* LABEL */}
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

//
// ===============================
// 🚀 FAB BUTTON (CENTER)
// ===============================
//
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