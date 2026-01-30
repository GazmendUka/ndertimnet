// ============================================================
// src/components/layout/Layout.jsx
// Final cleaned + stable version (v6 nested routes)
// ============================================================

import React from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* SIDEBAR — Desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">

        {/* TOPBAR */}
        <header
          className="
            premium-header sticky top-0 z-20
            px-6 md:px-10 py-4
            flex items-center justify-between
          "
        >
          <h1 className="text-lg font-semibold text-gray-800 tracking-tight">
            {user?.role === "company" ? "Panel i Kompanisë" : "Panel i Klientit"}
          </h1>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-800">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>

            <div
              className="
                w-10 h-10 rounded-full bg-gray-200
                flex items-center justify-center
                text-gray-600 font-semibold
              "
            >
              {user?.first_name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="px-6 md:px-10 py-8">
          <Outlet />
        </main>
      </div>

      {/* MOBILE NAV */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
