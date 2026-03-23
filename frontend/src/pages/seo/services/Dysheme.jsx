// src/pages/seo/services/Dysheme.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Layers,
  CheckCircle2,
  ShieldCheck,
  Hammer,
  HelpCircle,
} from "lucide-react";

export default function Dysheme() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Dysheme në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej profesionistë për punime dyshemeje. Parket, laminat, pllaka dhe më shumë për ambiente moderne."
        />

        <meta
          name="keywords"
          content="dysheme, parket, laminat, pllaka dysheme, dysheme Shqipëri, dysheme Kosovë"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/dysheme" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Layers className="h-4 w-4" />
                Punime profesionale dyshemeje
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Dysheme për çdo ambient
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Dyshemeja është një nga elementët më të rëndësishëm të një
                hapësire. Ajo ndikon drejtpërdrejt në komoditetin, estetikën
                dhe funksionalitetin e ambientit.
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
            Çfarë përfshin puna e dyshemesë?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Punimet e dyshemesë përfshijnë vendosjen dhe përfundimin e
            sipërfaqeve të brendshme, duke përdorur materiale të ndryshme si
            parket, laminat, pllaka apo beton dekorativ.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Një dysheme e realizuar mirë përmirëson komoditetin dhe krijon një
            ambient estetik dhe funksional.
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
                "Vendosje parketi",
                "Vendosje laminati",
                "Pllaka për dysheme",
                "Përgatitje e sipërfaqes",
                "Nivelim dhe izolim",
                "Përfundime dhe mirëmbajtje",
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
                Kur ke nevojë për dysheme të re?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Ndryshimi i dyshemesë është i nevojshëm kur ajo është e
                konsumuar, e dëmtuar ose nuk i përshtatet më stilit të
                hapësirës.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Dysheme e vjetër",
                "Dëmtime ose konsumim",
                "Renovim i hapësirës",
                "Ndryshim stilistik",
                "Përmirësim i komoditetit",
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
              "/pllakashtrues",
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
                  Sa kushton një dysheme e re?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga materiali dhe sipërfaqja.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  Cili material është më i mirë?
                </h4>
                <p className="text-slate-600">
                  Varet nga përdorimi – parketi për estetikë, pllakat për
                  qëndrueshmëri.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Gati për të ndryshuar dyshemenë?
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