// src/pages/seo/services/RenovimBanjo.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Bath,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export default function RenovimBanjo() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Renovim banjo në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej kompani për renovim banjo. Pllaka, instalime, hidroizolim dhe rifinitura për banjo moderne."
        />

        <meta
          name="keywords"
          content="renovim banjo, banjo moderne, pllaka banjo, hidraulik banjo, instalime banjo"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/renovim-banjo" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Bath className="h-4 w-4" />
                Renovim profesional banjo
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Renovim banjo moderne dhe funksionale
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Banja është një nga hapësirat më të rëndësishme në shtëpi.
                Një renovim i mirë rrit komoditetin, funksionalitetin dhe
                vlerën e pronës.
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
            Çfarë përfshin renovimi i banjos?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Renovimi i banjos përfshin transformimin e plotë ose të pjesshëm
            të hapësirës. Ky proces mund të përfshijë pllaka të reja,
            instalime hidraulike, ndriçim dhe elemente sanitare.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Një banjo moderne duhet të jetë funksionale, higjienike dhe
            estetikisht e këndshme.
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
                "Prishje dhe përgatitje",
                "Punime hidraulike",
                "Instalime elektrike",
                "Hidroizolim",
                "Vendosje pllakash",
                "Montim pajisjesh sanitare",
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
                Kur duhet të renovosh banjon?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Renovimi i banjos është i nevojshëm kur hapësira është e
                vjetëruar, ka probleme me lagështinë ose nuk është më funksionale.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Lagështirë dhe myk",
                "Pllaka të dëmtuara",
                "Instalime të vjetra",
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

        {/* WHY NDERTIMNET */}
        <section className="border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Pse të përdorësh Ndertimnet?
            </h2>

            <div className="grid md:grid-cols-3 gap-6 mt-10">
              {[
                "Gjej profesionistë të besueshëm",
                "Krahaso oferta dhe çmime",
                "Kursen kohë dhe përpjekje",
              ].map((item) => (
                <div key={item} className="p-6 bg-slate-50 rounded-xl">
                  <ShieldCheck className="h-6 w-6 mb-2" />
                  <p>{item}</p>
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
              "/renovim-kuzhine",
              "/elektricist",
              "/fasada",
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
                  Sa kushton renovimi i banjos?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga madhësia dhe materialet.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  Sa zgjat renovimi?
                </h4>
                <p className="text-slate-600">
                  Nga disa ditë deri në disa javë.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Gati për të renovuar banjon?
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