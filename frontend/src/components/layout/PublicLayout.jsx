// ===========================================
// src/layouts/PublicLayout.jsx
// Global layout för alla public pages
// ===========================================

import { Link, Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">

      {/* ================= NAVBAR ================= */}
      <header className="w-full border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* LOGO */}
          <Link to="/" className="text-xl font-semibold tracking-tight">
            Ndertimnet
          </Link>

          {/* NAV */}
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/about" className="hover:opacity-70">
              Rreth nesh
            </Link>

            <Link to="/contact" className="hover:opacity-70">
              Kontakt
            </Link>

            <Link
              to="/login"
              className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:opacity-90"
            >
              Kyçu
            </Link>
          </nav>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t py-10 text-center text-sm text-gray-500">
        © 2026 Ndertimnet
      </footer>

    </div>
  );
}