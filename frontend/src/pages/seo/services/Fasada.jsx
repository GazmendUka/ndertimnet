// src/pages/seo/services/Fasada.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Building2,
  CheckCircle2,
  ShieldCheck,
  Paintbrush,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export default function Fasada() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Fasada në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej kompani për punime fasade dhe izolim. Përmirëso pamjen dhe mbrojtjen e objektit."
        />

        <meta
          name="keywords"
          content="fasada, izolim fasade, punime fasade, lyerje fasade, termoizolim"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/fasada" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Building2 className="h-4 w-4" />
                Punime profesionale fasade
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Fasada dhe izolimi i objektit
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Fasada është pamja dhe mbrojtja e jashtme e objektit. Një
                fasadë e realizuar mirë përmirëson estetikën dhe rrit
                efikasitetin energjetik.
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
            Çfarë përfshin fasada?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Fasada përfshin shtresat e jashtme të ndërtesës, duke përfshirë
            izolimin, lyerjen dhe mbrojtjen nga kushtet atmosferike.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Një fasadë e mirë ndihmon në ruajtjen e temperaturës së brendshme,
            ul konsumin e energjisë dhe rrit jetëgjatësinë e objektit.
          </p>
        </section>

        {/* INCLUDES */}
        <section className="bg-slate-50 border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Çfarë përfshijnë punimet e fasadës
            </h2>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              {[
                "Izolim termik (termoizolim)",
                "Lyerje e fasadës",
                "Shtresa mbrojtëse",
                "Riparime të sipërfaqeve",
                "Dekorim i jashtëm",
                "Mirëmbajtje dhe restaurim",
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
                Kur ke nevojë për fasadë?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Punimet e fasadës janë të nevojshme kur objekti ka humbur
                izolimin, ka dëmtime ose kërkon përmirësim estetik.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Dëmtime në mure të jashtme",
                "Izolim i dobët",
                "Pamje e vjetëruar",
                "Rritje e efikasitetit energjetik",
                "Renovim i përgjithshëm",
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
                "Gjej kompani fasade të besueshme",
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
                  Sa kushton fasada?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga sipërfaqja dhe materialet.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  A ndihmon izolimi në kursim energjie?
                </h4>
                <p className="text-slate-600">
                  Po, izolimi ul humbjen e nxehtësisë dhe kostot.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Gati për të përmirësuar fasadën?
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