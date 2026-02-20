// src/components/layout/Layout.jsx

import React, { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import CompanyOnboardingBanner from "../company/CompanyOnboardingBanner";

export default function Layout() {
  const { user, isCompany, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // 🔒 Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* SIDEBAR — Desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">
        {/* TOPBAR */}
        <header
          className="
            premium-header sticky top-0 z-20
            px-6 md:px-10 py-4
            flex items-center justify-between
          "
        >
          {/* LEFT TITLE */}
          <h1 className="text-lg font-semibold text-gray-800 tracking-tight">
            {user?.role === "company"
              ? "Panel i Kompanisë"
              : "Panel i Klientit"}
          </h1>

          {/* RIGHT USER / COMPANY INFO */}
          <div className="flex items-center gap-4">
            {/* Name Section */}
            <div className="text-right">
              {user?.role === "company" ? (
                <>
                  <p className="font-medium text-gray-800">
                    {user?.company?.company_name || "Company"}
                  </p>
                  <p className="text-xs text-gray-400">Kompani</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-800">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-400">Klient</p>
                </>
              )}
            </div>

            {/* Avatar + Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="
                  w-10 h-10 rounded-full overflow-hidden
                  bg-gray-200 flex items-center justify-center
                  text-gray-600 font-semibold
                  cursor-pointer
                "
              >
                {user?.role === "company" ? (
                  user?.company?.logo ? (
                    <img
                      src={user.company.logo}
                      alt={user.company.company_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.company?.company_name?.[0]?.toUpperCase() || "C"
                  )
                ) : (
                  user?.first_name?.[0]?.toUpperCase() || "U"
                )}
              </div>

              {/* DROPDOWN */}
              {dropdownOpen && (
                <div
                  className="
                    absolute right-0 mt-2 w-44
                    bg-white border border-gray-200
                    rounded-lg shadow-lg
                    py-2 z-50
                  "
                >
                  <button
                    onClick={() => {
                      navigate(
                        user?.role === "company"
                          ? "/profile/company"
                          : "/profile/customer"
                      );
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Profil
                  </button>

                  <button
                    onClick={() => {
                      logout(); // 👈 korrekt logout via context
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Logga ut
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 px-6 md:px-10 pt-6 pb-10">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* ONBOARDING BANNER (Company only) */}
            {isCompany && (
              <CompanyOnboardingBanner
                company={user?.company || null}
                resendVerificationEndpoint="/accounts/resend-verification/"
                profileRoute="/profile/company"
              />
            )}

            <Outlet />
          </div>
        </main>
      </div>

      {/* MOBILE NAV */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
