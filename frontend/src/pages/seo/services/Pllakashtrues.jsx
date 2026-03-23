// src/pages/seo/services/Pllakashtrues.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Grid3X3,
  CheckCircle2,
  ShieldCheck,
  Hammer,
  HelpCircle,
} from "lucide-react";

export default function Pllakashtrues() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Pllakashtrues në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej pllaka-shtrues për vendosje profesionale të pllakave. Punime për banjo, kuzhine dhe ambiente të tjera."
        />

        <meta
          name="keywords"
          content="pllakashtrues, vendosje pllaka, pllaka banjo, pllaka kuzhine, pllaka dysheme"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/pllakashtrues" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Grid3X3 className="h-4 w-4" />
                Vendosje profesionale pllakash
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Pllakashtrues për punime precize dhe cilësore
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Vendosja e pllakave kërkon saktësi dhe përvojë. Një punë e
                realizuar mirë garanton një pamje estetike dhe qëndrueshmëri
                afatgjatë.
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
            Çfarë përfshin puna e pllakashtruesit?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Pllakashtruesi merret me vendosjen e pllakave në dysheme dhe mure,
            duke siguruar një përfundim të rregullt dhe të qëndrueshëm.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Kjo përfshin përgatitjen e sipërfaqes, vendosjen e pllakave,
            fugimin dhe përfundimet finale.
          </p>
        </section>

        {/* INCLUDES */}
        <section className="bg-slate-50 border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Çfarë përfshijnë punimet
            </h2>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              {[
                "Vendosje pllaka në dysheme",
                "Vendosje pllaka në mure",
                "Pllaka për banjo dhe kuzhine",
                "Përgatitje e sipërfaqeve",
                "Fugim dhe përfundime",
                "Punime dekorative",
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
                Kur ke nevojë për pllaka?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Vendosja e pllakave është e nevojshme gjatë ndërtimit ose
                renovimit të hapësirave të brendshme.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Renovim banjo",
                "Renovim kuzhine",
                "Ndërtim i ri",
                "Ndryshim dyshemeje",
                "Përmirësim estetik",
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
              "/renovim-banjo",
              "/renovim-kuzhine",
              "/elektricist",
              "/fasada",
              "/cati",
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
                  Sa kushton vendosja e pllakave?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga sipërfaqja dhe lloji i pllakave.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  Sa zgjat puna?
                </h4>
                <p className="text-slate-600">
                  Nga disa ditë në varësi të projektit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Gati për të vendosur pllakat?
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