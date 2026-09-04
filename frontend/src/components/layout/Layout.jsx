// src/components/layout

import React, { useState, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

import CompanyOnboardingBanner from "../company/CompanyOnboardingBanner";
import CustomerEmailVerificationBanner from "../customer/CustomerEmailVerificationBanner";

export default function Layout() {

  const { user, logout, isCompany, isCustomer, loading } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();

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

  // ===========================================
  // AUTH GUARD
  // ===========================================

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Po ngarkohet paneli...
      </div>
    );
  }

  return (

    <div className="flex min-h-screen bg-gray-50">

      {/* SIDEBAR — Desktop */}
      <div className={isNativeApp ? "hidden" : "hidden lg:block"}>
        <Sidebar />
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">

        {/* TOPBAR */}
        <header
          className="
            premium-header sticky top-0 z-20
            min-h-[68px] px-4 sm:px-6 md:px-10 py-3
            flex items-center justify-between
          "
        >

          {/* LEFT TITLE */}
          <h1 className="min-w-0 truncate pr-3 text-base font-semibold text-gray-800 tracking-tight sm:text-lg">
            {user?.role === "company"
              ? "Panel i Kompanisë"
              : "Panel i Klientit"}
          </h1>

          {/* RIGHT USER / COMPANY INFO */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">

            {/* Name Section */}
            <div className="hidden max-w-[15rem] text-right sm:block">

              {user?.role === "company" ? (
                <>
                  <p className="truncate font-medium text-gray-800">
                    {user?.company?.company_name || "Company"}
                  </p>
                  <p className="text-xs text-gray-400">Kompani</p>
                </>
              ) : (
                <>
                  <p className="truncate font-medium text-gray-800">
                    {user?.first_name} {user?.last_name}
                  </p>
                </>
              )}

            </div>

            {/* Avatar + Dropdown */}
            <div className="relative" ref={dropdownRef}>

              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="
                  w-10 h-10 rounded-full overflow-hidden
                  bg-gray-200 flex items-center justify-center
                  text-gray-600 font-semibold
                  cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef7d22]
                "
                aria-label="Hap menynë e profilit"
                aria-expanded={dropdownOpen}
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

              </button>

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
                          ? "/company/profile"
                          : "/customer/profile"
                      );

                      setDropdownOpen(false);

                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Profil
                  </button>

                  <button
                    onClick={() => {
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Dil
                  </button>

                </div>

              )}

            </div>

          </div>

        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 px-4 sm:px-6 md:px-10 pt-4 sm:pt-6 pb-32 lg:pb-10">

          <div className="max-w-6xl mx-auto space-y-8">

            {/* COMPANY ONBOARDING */}
            {isCompany && (
              <CompanyOnboardingBanner
                company={user?.company || null}
                resendVerificationEndpoint="/accounts/resend-verification/"
                profileRoute="/company/profile"
              />
            )}

            {/* CUSTOMER EMAIL VERIFICATION */}
            {isCustomer && user && (
              <CustomerEmailVerificationBanner
                user={user}
                resendVerificationEndpoint="/accounts/resend-verification/"
              />
            )}

            {/* PAGE */}
            <Outlet />

          </div>

        </main>

      </div>

      {/* MOBILE NAV */}
      <div className={isNativeApp ? "block" : "lg:hidden"}>
        <MobileNav alwaysVisible={isNativeApp} />
      </div>

    </div>

  );
}
