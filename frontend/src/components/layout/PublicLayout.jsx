// src/components/layouts/PublicLayout.jsx

import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Building2,
  Hammer,
  Home,
  Info,
  LogIn,
  Mail,
  Menu,
  MoreHorizontal,
  Newspaper,
  Plus,
  X,
} from "lucide-react";
import MobileMoreSheet from "./MobileMoreSheet";

const logoSrc = "/ndertimnet-logo-full-width/ndertimnet-logo-search-transparent.png";
const servicePaths = [
  "/ndertime",
  "/renovime",
  "/renovim-banjo",
  "/renovim-kuzhine",
  "/elektricist",
  "/lyerje",
  "/fasada",
  "/cati",
  "/pllakashtrues",
  "/dysheme",
  "/ndertim/",
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const isNativeApp = Capacitor.isNativePlatform();

  const startX = useRef(null);
  const navTouchStartY = useRef(null);

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);

    if (location.hash) {
      window.requestAnimationFrame(() => {
        document
          .querySelector(location.hash)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.pathname, location.hash]);

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

  const handleNavTouchStart = (event) => {
    navTouchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleNavTouchEnd = (event) => {
    if (navTouchStartY.current === null) return;

    const endY = event.changedTouches[0]?.clientY ?? navTouchStartY.current;
    if (navTouchStartY.current - endY > 45) setMoreOpen(true);
    navTouchStartY.current = null;
  };

  const publicPathIsActive = (target) => {
    if (target === "/") return location.pathname === "/" && !location.hash;
    return location.pathname.startsWith(target);
  };

  const servicesAreActive =
    location.hash === "#sherbimet" ||
    servicePaths.some((target) => location.pathname.startsWith(target));

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">

      {/* ================= NAVBAR ================= */}
      <header className="w-full border-b bg-white sticky top-0 z-50">
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center ${isNativeApp ? "justify-center" : "justify-between"}`}>

          <Link to="/" className="inline-flex items-center">
            <img
              src={logoSrc}
              alt="Ndertimnet"
              className="h-11 w-auto sm:h-[53px]"
            />
          </Link>

          {/* DESKTOP NAV */}
          {!isNativeApp && <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/perditesime">Përditësime</Link>
            <Link to="/about">Rreth nesh</Link>
            <Link to="/contact">Kontakt</Link>

            <Link
              to="/login"
              className="bg-black text-white px-4 py-2 rounded-lg font-medium"
            >
              Kyçu
            </Link>
          </nav>}

          {/* MOBILE BUTTON */}
          {!isNativeApp && <button
            type="button"
            onClick={() => setOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Hap menynë"
            aria-expanded={open}
          >
            <Menu size={22} />
          </button>}
        </div>
      </header>

      {/* ================= OVERLAY ================= */}
      {!isNativeApp && <div
        onClick={() => setOpen(false)}
        className={`
          fixed inset-0 bg-black/40 z-40
          transition-opacity duration-300
          ${open ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      />}

      {/* ================= DRAWER ================= */}
      {!isNativeApp && <div
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
          <img
            src={logoSrc}
            alt="Ndertimnet"
            className="h-11 w-auto sm:h-[46px]"
          />

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Mbyll menynë"
          >
            <X size={20} />
          </button>
        </div>

        {/* LINKS */}
        <div className="flex flex-col p-6 gap-4 text-base">

          <Link onClick={() => setOpen(false)} to="/perditesime">Përditësime</Link>
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
      </div>}

      {/* ================= CONTENT ================= */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ================= FOOTER (UNCHANGED) ================= */}
      <footer className="border-t mt-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-10 text-sm">

          {/* BRAND */}
          <div>
            <img
              src={logoSrc}
              alt="Ndertimnet"
              className="h-[53px] w-auto mb-3"
            />
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

        {isNativeApp && <div className="h-24" aria-hidden="true" />}
      </footer>

      {isNativeApp && (
        <>
          <nav
            aria-label="Navigimi kryesor"
            onTouchStart={handleNavTouchStart}
            onTouchEnd={handleNavTouchEnd}
            className="fixed inset-x-3 z-[60] mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white/95 px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] backdrop-blur-xl"
            style={{ bottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
          >
            <div className="grid grid-cols-5 items-end">
              <PublicNavItem to="/" icon={Home} label="Ballina" active={publicPathIsActive("/")} />
              <PublicNavItem to="/#sherbimet" icon={Hammer} label="Shërbime" active={servicesAreActive} />
              <PublicNavItem to="/login" icon={Plus} label="Publiko" emphasized />
              <PublicNavItem to="/perditesime" icon={Newspaper} label="Të reja" active={publicPathIsActive("/perditesime")} />
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-gray-500 active:scale-95"
                aria-expanded={moreOpen}
              >
                <MoreHorizontal size={22} />
                Më shumë
              </button>
            </div>
          </nav>

          <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Më shumë">
            <MoreLink to="/about" icon={Info} onClick={() => setMoreOpen(false)}>Rreth nesh</MoreLink>
            <MoreLink to="/contact" icon={Mail} onClick={() => setMoreOpen(false)}>Kontakt</MoreLink>
            <MoreLink to="/register/company" icon={Building2} onClick={() => setMoreOpen(false)}>Regjistro kompaninë</MoreLink>
            <MoreLink to="/login" icon={LogIn} onClick={() => setMoreOpen(false)}>Kyçu</MoreLink>
          </MobileMoreSheet>
        </>
      )}

    </div>
  );
}

function PublicNavItem({ to, icon: Icon, label, active = false, emphasized = false }) {
  return (
    <Link
      to={to}
      className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium active:scale-95 ${active ? "text-[#17643f]" : "text-gray-500"}`}
    >
      {emphasized ? (
        <span className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#ef7d22] text-white shadow-lg">
          <Icon size={23} strokeWidth={2.5} />
        </span>
      ) : (
        <Icon size={21} strokeWidth={active ? 2.5 : 2} />
      )}
      <span className={emphasized ? "mt-7 text-[#12251b]" : ""}>{label}</span>
    </Link>
  );
}

function MoreLink({ to, icon: Icon, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[#12251b] active:bg-gray-100"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3ee] text-[#17643f]">
        <Icon size={20} />
      </span>
      {children}
    </Link>
  );
}
