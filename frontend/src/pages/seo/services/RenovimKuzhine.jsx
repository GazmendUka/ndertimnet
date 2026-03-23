// src/pages/seo/services/RenovimKuzhine.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ChefHat,
  CheckCircle2,
  Sparkles,
  Wrench,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export default function RenovimKuzhinePage() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Renovim kuzhine në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej kompani për renovim kuzhine. Modernizo kuzhinën me profesionistë për mobilim, instalime dhe dizajn funksional."
        />

        <meta
          name="keywords"
          content="renovim kuzhine, kuzhine moderne, mobilim kuzhine, instalime kuzhine, dizajn kuzhine"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/renovim-kuzhine" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <ChefHat className="h-4 w-4" />
                Renovim profesional i kuzhinës
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Renovim kuzhine moderne dhe funksionale
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Kuzhina është zemra e shtëpisë. Një renovim i mirë përmirëson
                jo vetëm pamjen, por edhe funksionalitetin dhe komoditetin në
                përditshmëri.
              </p>

              <div className="mt-8 flex gap-4">
                <Link
                  to="/register/customer"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Publiko projektin
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* INTRO */}
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold">
            Çfarë përfshin renovimi i kuzhinës?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Renovimi i kuzhinës përfshin transformimin e një hapësire ekzistuese
            në një ambient modern, praktik dhe estetik. Ky proces mund të
            përfshijë mobilim të ri, instalime elektrike dhe hidraulike,
            sipërfaqe pune dhe organizim më efikas të hapësirës.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Një kuzhinë e projektuar mirë jo vetëm që rrit vlerën e pronës, por
            gjithashtu përmirëson mënyrën se si përdoret hapësira çdo ditë.
          </p>
        </section>

        {/* INCLUDES */}
        <section className="bg-slate-50 border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Çfarë përfshin zakonisht renovimi
            </h2>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              {[
                "Mobilim dhe dollapë kuzhine",
                "Instalime elektrike dhe ndriçim",
                "Instalime hidraulike",
                "Vendosje pllakash",
                "Sipërfaqe pune (countertop)",
                "Organizim i hapësirës",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 bg-white p-4 rounded-xl border"
                >
                  <CheckCircle2 className="h-5 w-5 mt-1" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHEN */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-3xl font-bold">
                Kur duhet të renovosh kuzhinën?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Renovimi i kuzhinës është i nevojshëm kur hapësira bëhet e
                vjetëruar, jo funksionale ose nuk i përshtatet më nevojave të tua.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Mobilim i vjetër",
                "Hapësirë jo funksionale",
                "Instalime të amortizuara",
                "Dëshirë për stil modern",
                "Rritje e vlerës së pronës",
              ].map((item) => (
                <div key={item} className="flex gap-3 mt-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INTERNAL LINKS */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h3 className="font-semibold mb-4">Shërbime të tjera</h3>

          <div className="flex flex-wrap gap-4">
            {[
              "/ndertime",
              "/renovime",
              "/renovim-banjo",
              "/renovim-kuzhine",
              "/elektricist",
              "/fasada",
              "/lyrje",
              "/cati",
              "/pllakashtrues",
              "/dysheme",
            ].map((path) => (
              <Link key={path} to={path} className="text-blue-600">
                {path.replace("/", "")}
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-slate-50 border-t">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <HelpCircle className="h-6 w-6" />
              Pyetje të shpeshta
            </h2>

            <div className="mt-10 space-y-6">
              <div>
                <h4 className="font-semibold">
                  Sa kushton renovimi i kuzhinës?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga madhësia, materialet dhe kompleksiteti.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  Sa zgjat renovimi?
                </h4>
                <p className="text-slate-600">
                  Zakonisht nga disa ditë deri në disa javë.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Gati për të renovuar kuzhinën?
            </h2>

            <div className="mt-6 flex gap-4">
              <Link
                to="/register/customer"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Publiko projektin
              </Link>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}