// frontend/src/auth/RegisterChoice.js

import { ArrowLeft, ArrowRight, Building2, UserRound } from "lucide-react";
import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterChoice() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6 sm:px-6">
      <section className="w-full max-w-2xl rounded-2xl border border-[#e5e0d5] bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <img
            src="/ndertimnet-logo-full-width/ndertimnet-logo-search-transparent.png"
            alt="Ndertimnet"
            className="h-10 w-auto"
          />
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#5f6f66] hover:bg-[#f7f4ee]"
          >
            <ArrowLeft size={18} />
            Kthehu
          </Link>
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-semibold text-[#17643f]">Regjistrim</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#12251b]">
            Si dëshironi ta përdorni Ndertimnet?
          </h1>
          <p className="mt-3 leading-7 text-[#5f6f66]">
            Zgjidhni llojin e llogarisë që i përshtatet nevojave tuaja.
          </p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate("/register/company")}
            className="group flex min-h-[190px] flex-col items-start justify-between rounded-xl border border-[#d8e5dd] bg-[#f4f9f6] p-5 text-left transition hover:border-[#17643f] hover:shadow-sm"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#17643f] text-white">
              <Building2 size={24} />
            </span>
            <span>
              <span className="flex items-center justify-between gap-3 text-lg font-semibold text-[#12251b]">
                Kompani <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </span>
              <span className="mt-1 block text-sm leading-6 text-[#5f6f66]">
                Për biznese që ofrojnë shërbime ndërtimi dhe renovimi.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/register/customer")}
            className="group flex min-h-[190px] flex-col items-start justify-between rounded-xl border border-[#f0d6c1] bg-[#fff7f0] p-5 text-left transition hover:border-[#ef7d22] hover:shadow-sm"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ef7d22] text-white">
              <UserRound size={24} />
            </span>
            <span>
              <span className="flex items-center justify-between gap-3 text-lg font-semibold text-[#12251b]">
                Klient <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </span>
              <span className="mt-1 block text-sm leading-6 text-[#5f6f66]">
                Për persona që duan të publikojnë një projekt dhe të marrin oferta.
              </span>
            </span>
          </button>
        </div>

        <p className="mt-7 text-center text-sm text-[#5f6f66]">
          Ke tashmë një llogari?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#17643f] hover:underline"
          >
            Kyçu këtu
          </Link>
        </p>
      </section>
    </main>
  );
}
