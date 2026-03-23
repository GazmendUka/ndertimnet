// src/components/layouts/PublicLayout.jsx

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
      <footer className="border-t mt-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-10 text-sm">

          {/* BRAND */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Ndertimnet
            </h3>
            <p className="text-gray-600">
              Platformë për të gjetur kompani ndërtimi dhe profesionistë për
              çdo projekt ndërtimi dhe renovimi në Kosovë dhe Shqipëri.
            </p>
          </div>

          {/* CITIES */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Qytetet
            </h3>
            <div className="flex flex-col gap-2 text-gray-600">

              <Link to="/ndertim/prishtine" className="hover:underline">
                Prishtinë
              </Link>

              <Link to="/ndertim/tirane" className="hover:underline">
                Tiranë
              </Link>

              <Link to="/ndertim/durres" className="hover:underline">
                Durrës
              </Link>

              <Link to="/ndertim/vlore" className="hover:underline">
                Vlorë
              </Link>

              <Link to="/ndertim/prizren" className="hover:underline">
                Prizren
              </Link>

              <Link to="/ndertim/mitrovice" className="hover:underline">
                Mitrovicë
              </Link>

            </div>
          </div>

          {/* SERVICES */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Shërbimet
            </h3>

            <div className="flex flex-col gap-2 text-gray-600">

              <Link to="/ndertime" className="hover:underline">
                Ndërtim
              </Link>

              <Link to="/renovime" className="hover:underline">
                Renovime
              </Link>

              <Link to="/renovim-banjo" className="hover:underline">
                Renovim banjo
              </Link>

              <Link to="/renovim-kuzhine" className="hover:underline">
                Renovim kuzhine
              </Link>

              <Link to="/elektricist" className="hover:underline">
                Elektricist
              </Link>

              <Link to="/lyerje" className="hover:underline">
                Lyerje
              </Link>

              <Link to="/fasada" className="hover:underline">
                Fasada
              </Link>

              <Link to="/cati" className="hover:underline">
                Çati
              </Link>

              <Link to="/pllakashtrues" className="hover:underline">
                Pllakashtrues
              </Link>

              <Link to="/dysheme" className="hover:underline">
                Dysheme
              </Link>

            </div>
          </div>

        </div>

        {/* BOTTOM */}
        <div className="border-t text-center py-6 text-xs text-gray-500">
          © 2026 Ndertimnet. Të gjitha të drejtat e rezervuara.
        </div>
      </footer>

    </div>
  );
}