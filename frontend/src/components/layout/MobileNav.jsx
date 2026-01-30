// src/components/layout/MobileNav.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

import { Home, User, Briefcase, FileText } from "lucide-react";

export default function MobileNav() {
  const { isCustomer, isCompany } = useAuth();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  return (
    <nav
      className="
        lg:hidden
        fixed bottom-0 left-0 right-0
        bg-white/90 backdrop-blur-xl
        border-t border-gray-200
        flex items-center justify-around
        py-3 z-50
      "
    >
      {isCustomer && (
        <>
          <MobileItem
            icon={<Home size={22} />}
            to="/dashboard/customer"
            active={isActive("/dashboard/customer")}
          />
          <MobileItem
            icon={<FileText size={22} />}
            to="/jobrequests"
            active={isActive("/jobrequests")}
          />
          <MobileItem
            icon={<User size={22} />}
            to="/profile/customer"
            active={isActive("/profile/customer")}
          />
        </>
      )}

      {isCompany && (
        <>
          <MobileItem
            icon={<Home size={22} />}
            to="/dashboard/company"
            active={isActive("/dashboard/company")}
          />
          <MobileItem
            icon={<Briefcase size={22} />}
            to="/jobrequests"
            active={isActive("/jobrequests")}
          />
          <MobileItem
            icon={<FileText size={22} />}
            to="/leads/mine"
            active={isActive("/leads")}
          />
          <MobileItem
            icon={<User size={22} />}
            to="/profile/company"
            active={isActive("/profile/company")}
          />
        </>
      )}
    </nav>
  );
}

function MobileItem({ to, icon, active }) {
  return (
    <Link
      to={to}
      className="
        flex flex-col items-center
        text-xs font-medium
        transition active:scale-95
      "
    >
      <span className={active ? "text-gray-900" : "text-gray-400"}>
        {icon}
      </span>

      {/* Active indicator (tiny dot) */}
      <span
        className={`
          mt-1 w-1.5 h-1.5 rounded-full
          transition
          ${active ? "bg-gray-900" : "bg-transparent"}
        `}
      />
    </Link>
  );
}
