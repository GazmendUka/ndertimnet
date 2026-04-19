// src/components/layouts/PublicLayout.jsx

import { Link, Outlet } from "react-router-dom";
import { useState, useRef } from "react";
import { Menu, X } from "lucide-react";

export default function PublicLayout() {
  const [open, setOpen] = useState(false);

  const startX = useRef(null);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!startX.current) return;

    const diff = e.touches[0].clientX - startX.current;

    if (diff > 80) {
      setOpen(false);
      startX.current = null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">

      {/* ================= NAVBAR ================= */}
      <header className="w-full border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <Link to="/" className="text-xl font-semibold tracking-tight">
            Ndertimnet
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/updates">Updates</Link>
            <Link to="/about">Rreth nesh</Link>
            <Link to="/contact">Kontakt</Link>

            <Link
              to="/login"
              className="bg-black text-white px-4 py-2 rounded-lg font-medium"
            >
              Kyçu
            </Link>
          </nav>

          {/* MOBILE BUTTON */}
          <button
            onClick={() => setOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* ================= OVERLAY ================= */}
      <div
        onClick={() => setOpen(false)}
        className={`
          fixed inset-0 bg-black/40 z-40
          transition-opacity duration-300
          ${open ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* ================= DRAWER ================= */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className={`
          fixed top-0 right-0 h-full w-[85%] max-w-sm
          bg-white z-50 shadow-2xl
          transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <span className="font-semibold">Menu</span>

          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* LINKS */}
        <div className="flex flex-col p-6 gap-4 text-base">

          <Link onClick={() => setOpen(false)} to="/updates">Updates</Link>
          <Link onClick={() => setOpen(false)} to="/about">Rreth nesh</Link>
          <Link onClick={() => setOpen(false)} to="/contact">Kontakt</Link>

        </div>

        {/* CTA */}
        <div className="mt-auto p-6 border-t">
          <Link
            to="/login"
            onClick={() => setOpen(false)}
            className="block w-full text-center bg-gray-900 text-white py-3 rounded-xl font-medium active:scale-95 transition"
          >
            Kyçu
          </Link>
        </div>
      </div>

      {/* ================= CONTENT ================= */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ================= FOOTER (UNCHANGED) ================= */}
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

              <Link to="/ndertim/prishtine">Prishtinë</Link>
              <Link to="/ndertim/tirane">Tiranë</Link>
              <Link to="/ndertim/durres">Durrës</Link>
              <Link to="/ndertim/vlore">Vlorë</Link>
              <Link to="/ndertim/prizren">Prizren</Link>
              <Link to="/ndertim/mitrovice">Mitrovicë</Link>

            </div>
          </div>

          {/* SERVICES */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Shërbimet
            </h3>

            <div className="flex flex-col gap-2 text-gray-600">

              <Link to="/ndertime">Ndërtim</Link>
              <Link to="/renovime">Renovime</Link>
              <Link to="/renovim-banjo">Renovim banjo</Link>
              <Link to="/renovim-kuzhine">Renovim kuzhine</Link>
              <Link to="/elektricist">Elektricist</Link>
              <Link to="/lyerje">Lyerje</Link>
              <Link to="/fasada">Fasada</Link>
              <Link to="/cati">Çati</Link>
              <Link to="/pllakashtrues">Pllakashtrues</Link>
              <Link to="/dysheme">Dysheme</Link>

            </div>
          </div>

        </div>

        <div className="border-t text-center py-6 text-xs text-gray-500">
          © 2026 Ndertimnet. Të gjitha të drejtat e rezervuara.
        </div>
      </footer>

    </div>
  );
}