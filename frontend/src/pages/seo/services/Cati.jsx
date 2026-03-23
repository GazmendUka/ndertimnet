// src/pages/seo/services/Cati.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Home,
  CheckCircle2,
  ShieldCheck,
  Hammer,
  HelpCircle,
} from "lucide-react";

export default function Cati() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Çati në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej kompani për ndërtim dhe riparim çatie. Siguro mbrojtjen e objektit me punime profesionale."
        />

        <meta
          name="keywords"
          content="cati, ndërtim çatie, riparim çatie, çati Shqipëri, çati Kosovë"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/cati" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Home className="h-4 w-4" />
                Ndërtim dhe riparim çatie
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Çati e sigurt dhe e qëndrueshme
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Çatia është një nga elementët më të rëndësishëm të një
                ndërtese. Ajo mbron strukturën nga shiu, era dhe faktorët
                atmosferikë, duke garantuar siguri dhe jetëgjatësi.
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
            Çfarë përfshin puna e çatisë?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Punimet e çatisë përfshijnë ndërtimin, riparimin dhe mirëmbajtjen
            e strukturës së sipërme të objektit. Kjo përfshin materialet
            mbrojtëse, izolimin dhe elementët strukturorë.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Një çati e realizuar mirë garanton mbrojtje nga lagështia dhe
            faktorët atmosferikë, duke rritur jetëgjatësinë e ndërtesës.
          </p>
        </section>

        {/* INCLUDES */}
        <section className="bg-slate-50 border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Çfarë përfshijnë punimet e çatisë
            </h2>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              {[
                "Ndërtim çatie të re",
                "Riparim dhe mirëmbajtje",
                "Izolim i çatisë",
                "Vendosje tjegullash ose materialesh",
                "Sisteme kullimi (ulluqe)",
                "Kontroll dhe përforcim strukturor",
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
                Kur ke nevojë për çati?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Problemet me çatinë mund të shkaktojnë dëme serioze në
                strukturën e objektit, prandaj është e rëndësishme të
                ndërhyhet në kohë.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Rrjedhje uji",
                "Dëmtime nga moti",
                "Materiale të vjetruara",
                "Ndërtim i ri",
                "Nevojë për izolim më të mirë",
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
                "Gjej kompani të besueshme",
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
                  Sa kushton një çati?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga materiali dhe madhësia e çatisë.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  Sa zgjat ndërtimi i çatisë?
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
              Gati për të ndërtuar ose riparuar çatinë?
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