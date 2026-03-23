// src/pages/seo/services/Lyerje.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Paintbrush,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export default function Lyerje() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Lyerje në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej profesionistë për lyerje të brendshme dhe të jashtme. Fresko ambientin me punime cilësore."
        />

        <meta
          name="keywords"
          content="lyerje, bojatisje, lyerje shtëpie, lyerje muresh, lyerje fasade"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/lyerje" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Paintbrush className="h-4 w-4" />
                Lyerje profesionale
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Lyerje për ambiente të brendshme dhe të jashtme
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Lyerja është mënyra më e shpejtë për të transformuar një
                hapësirë. Një punë e mirë krijon një ambient të pastër,
                modern dhe estetik.
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
            Çfarë përfshin lyerja?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Lyerja përfshin përgatitjen e sipërfaqeve, aplikimin e bojës
            dhe përfundimet finale për të krijuar një pamje të pastër dhe
            uniforme.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Ajo mund të përdoret për të freskuar ambientin ekzistues ose
            si pjesë e një renovimi më të madh.
          </p>
        </section>

        {/* INCLUDES */}
        <section className="bg-slate-50 border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Çfarë përfshijnë punimet e lyerjes
            </h2>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              {[
                "Përgatitje e sipërfaqeve",
                "Lyerje muresh të brendshme",
                "Lyerje fasade",
                "Aplikim bojërash dekorative",
                "Riparim i dëmtimeve",
                "Përfundime dhe pastrim",
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
                Kur ke nevojë për lyerje?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Lyerja është e nevojshme kur ambienti duket i vjetëruar
                ose kur dëshiron një ndryshim të shpejtë dhe efektiv.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Ngjyra të zbehura",
                "Dëmtime në mure",
                "Renovim i hapësirës",
                "Ndryshim stilistik",
                "Freskim i ambientit",
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
                  Sa kushton lyerja?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga sipërfaqja dhe lloji i bojës.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  Sa zgjat puna?
                </h4>
                <p className="text-slate-600">
                  Zakonisht disa ditë në varësi të projektit.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Gati për të freskuar ambientin?
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