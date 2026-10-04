import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Bell,
  FileText,
  Home,
  Info,
  LogOut,
  Mail,
  Megaphone,
  MoreHorizontal,
  Newspaper,
  Plus,
  ReceiptText,
  User,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import api from "../../api/axios";
import MobileMoreSheet from "./MobileMoreSheet";

export default function MobileNav({ alwaysVisible = false }) {
  const { isCustomer, isCompany, logout, access } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const navTouchStartY = useRef(null);
  const path = location.pathname;

  const isActive = (target) => {
    if (target === "/customer" || target === "/company") return path === target;
    return path === target || path.startsWith(`${target}/`);
  };

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  useEffect(() => {
    if (!isCompany) return;

    const fetchLeads = async () => {
      try {
        const response = await api.get("/jobrequests/");
        const jobs = response.data || [];
        const lastVisit = localStorage.getItem("lastVisitJobRequests");

        if (lastVisit) {
          setNewLeadsCount(
            jobs.filter(
              (job) =>
                job.created_at && new Date(job.created_at) > new Date(lastVisit)
            ).length
          );
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    };

    fetchLeads();
  }, [isCompany]);

  useEffect(() => {
    if (!access || (!isCustomer && !isCompany)) return undefined;
    let active = true;

    const fetchUnread = async () => {
      try {
        const response = await api.get("/offers/unread-count/");
        if (active) setUnreadMessages(Number(response.data?.total) || 0);
      } catch {
        // Navigation remains usable if the counter cannot be refreshed.
      }
    };

    const handlePush = () => fetchUnread();
    fetchUnread();
    const interval = window.setInterval(fetchUnread, 15000);
    window.addEventListener("ndertimnet:push", handlePush);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("ndertimnet:push", handlePush);
    };
  }, [access, isCompany, isCustomer, path]);

  const markJobsAsSeen = () => {
    localStorage.setItem("lastVisitJobRequests", new Date().toISOString());
    setNewLeadsCount(0);
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

  const handleLogout = () => {
    logout();
    setMoreOpen(false);
    navigate("/");
  };

  return (
    <>
      <nav
        aria-label="Navigimi kryesor"
        onTouchStart={handleNavTouchStart}
        onTouchEnd={handleNavTouchEnd}
        className={`pointer-events-auto fixed inset-x-3 z-[60] mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white/95 px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.2)] backdrop-blur-xl ${alwaysVisible ? "" : "lg:hidden"}`}
        style={{ bottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-5 items-end">
          {isCustomer && (
            <>
              <MobileItem icon={Home} label="Ballina" to="/customer" active={isActive("/customer")} />
              <MobileItem icon={FileText} label="Kërkesat" to="/customer/jobrequests" active={isActive("/customer/jobrequests")} badge={unreadMessages} />
              <MobileItem icon={Plus} label="Publiko" to="/customer/jobrequests/create" emphasized />
              <MobileItem icon={User} label="Profili" to="/customer/profile" active={isActive("/customer/profile")} />
              <MoreButton open={moreOpen} onClick={() => setMoreOpen(true)} />
            </>
          )}

          {isCompany && (
            <>
              <MobileItem icon={Home} label="Ballina" to="/company" active={isActive("/company")} />
              <MobileItem
                icon={Briefcase}
                label="Punë"
                to="/company/jobrequests"
                active={isActive("/company/jobrequests")}
                badge={newLeadsCount}
                onClick={markJobsAsSeen}
              />
              <MobileItem icon={FileText} label="Ofertat" to="/company/leads/mine" active={isActive("/company/leads")} badge={unreadMessages} />
              <MobileItem icon={Megaphone} label="Marketing" to="/company/marketing" active={isActive("/company/marketing")} />
              <MoreButton open={moreOpen} onClick={() => setMoreOpen(true)} />
            </>
          )}
        </div>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Më shumë">
        <SheetLink to={isCompany ? "/company/profile" : "/customer/profile"} icon={User}>Profili</SheetLink>
        <SheetLink to={isCompany ? "/company/notifications" : "/customer/notifications"} icon={Bell}>Njoftimet</SheetLink>
        {isCompany && <SheetLink to="/company/payments" icon={ReceiptText}>Pagesat dhe konfirmimet</SheetLink>}
        {isCustomer && <SheetLink to="/customer/payments" icon={ReceiptText}>Pagesat dhe konfirmimet</SheetLink>}
        <SheetLink to="/perditesime" icon={Newspaper}>Përditësime</SheetLink>
        <SheetLink to="/about" icon={Info}>Rreth nesh</SheetLink>
        <SheetLink to="/contact" icon={Mail}>Kontakt</SheetLink>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-red-600 active:bg-red-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <LogOut size={20} />
          </span>
          Dil
        </button>
      </MobileMoreSheet>
    </>
  );
}

function MobileItem({ to, icon: Icon, label, active = false, badge = 0, onClick, emphasized = false }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition active:scale-95 ${active ? "text-[#17643f]" : "text-gray-500"}`}
    >
      {active && !emphasized && <span className="absolute inset-1 rounded-xl bg-[#eaf3ee]" />}
      {emphasized ? (
        <span className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#ef7d22] text-white shadow-lg">
          <Icon size={23} strokeWidth={2.5} />
        </span>
      ) : (
        <span className="relative">
          <Icon size={21} strokeWidth={active ? 2.5 : 2} />
          {Number(badge) > 0 && (
            <span className="absolute -right-3 -top-2 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
      )}
      <span className={`relative ${emphasized ? "mt-7 text-[#12251b]" : ""}`}>{label}</span>
    </Link>
  );
}

function MoreButton({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium active:scale-95 ${open ? "text-[#17643f]" : "text-gray-500"}`}
    >
      <MoreHorizontal size={22} />
      Më shumë
    </button>
  );
}

function SheetLink({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[#12251b] active:bg-gray-100"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf3ee] text-[#17643f]">
        <Icon size={20} />
      </span>
      {children}
    </Link>
  );
}
