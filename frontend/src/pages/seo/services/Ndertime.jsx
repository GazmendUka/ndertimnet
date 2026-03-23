//src/pages/seo/services/Ndertime.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Building2,
  CheckCircle2,
  Hammer,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export default function NdertimePage() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Ndërtim në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi për shtëpi dhe objekte. Publiko projektin dhe lidhu me profesionistë për ndërtim nga zero."
        />

        <meta
          name="keywords"
          content="ndërtim, kompani ndërtimi, ndërtim shtëpie, ndërtim objektesh, ndërtim Shqipëri, ndërtim Kosovë"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/ndertime" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Building2 className="h-4 w-4" />
                Shërbime profesionale ndërtimi
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Ndërtim nga themeli deri në përfundim
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Ndërtimi është baza e çdo projekti. Nga një ide fillestare
                deri te realizimi final, çdo hap kërkon planifikim të saktë
                dhe profesionistë të besueshëm.
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
            Çfarë përfshin ndërtimi?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Ndërtimi përfshin realizimin e një objekti nga zero – nga
            themelet, struktura, instalimet, deri te përfundimet finale.
            Ky proces kërkon koordinim të shumë profesioneve dhe një plan
            të qartë pune.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Qoftë për shtëpi, ndërtesa banimi apo objekte komerciale,
            ndërtimi i mirë garanton siguri, qëndrueshmëri dhe vlerë afatgjatë.
          </p>
        </section>

        {/* INCLUDES */}
        <section className="bg-slate-50 border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Çfarë përfshin një projekt ndërtimi
            </h2>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              {[
                "Punime themeli dhe strukture",
                "Ndërtim muresh dhe betonime",
                "Instalime elektrike dhe hidraulike",
                "Izolim dhe fasadë",
                "Punime të brendshme",
                "Përfundime finale",
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
                Kur ke nevojë për shërbime ndërtimi?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Ndërtimi është i nevojshëm kur dëshiron të krijosh një
                objekt të ri ose të zhvillosh një pronë nga fillimi.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Ndërtim shtëpie të re",
                "Objekt banimi",
                "Ndërtesa komerciale",
                "Zgjerim i pronës",
                "Projekt investimi",
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
                "Gjej kompani ndërtimi të besueshme",
                "Krahaso oferta dhe zgjidh më të mirën",
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
                  Sa kushton ndërtimi?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga madhësia dhe kompleksiteti i projektit.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  Sa zgjat ndërtimi?
                </h4>
                <p className="text-slate-600">
                  Zakonisht disa muaj deri në një vit, në varësi të projektit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Gati për të nisur ndërtimin?
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