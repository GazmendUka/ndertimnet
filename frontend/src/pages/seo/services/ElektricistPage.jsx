import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Zap,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  Lightbulb,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export default function ElektricistPage() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Elektricist në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej elektricist për instalime dhe riparime elektrike. Publiko projektin dhe lidhu me profesionistë për punime elektrike në shtëpi dhe objekte."
        />

        <meta
          name="keywords"
          content="elektricist, instalime elektrike, riparime elektrike, energji elektrike, ndriçim, elektrik Shqipëri, elektrik Kosovë"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/elektricist" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Zap className="h-4 w-4" />
                Shërbime profesionale elektrike
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Elektricist për instalime dhe riparime
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Instalimet elektrike janë ndër elementët më kritikë të çdo
                ndërtese. Një sistem i sigurt dhe i realizuar mirë garanton
                funksionim korrekt, kursim energjie dhe siguri për banorët.
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
            Çfarë përfshin puna e elektricistit?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Elektricisti merret me instalimin, mirëmbajtjen dhe riparimin e
            sistemeve elektrike në shtëpi, banesa dhe objekte komerciale.
            Punimet përfshijnë gjithçka nga instalimet bazë deri te sistemet
            komplekse të ndriçimit dhe energjisë.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Një instalim i bërë siç duhet jo vetëm që rrit sigurinë, por edhe
            përmirëson efikasitetin energjetik dhe funksionalitetin e
            hapësirës. Për këtë arsye, zgjedhja e profesionistëve të duhur është
            thelbësore.
          </p>
        </section>

        {/* INCLUDES */}
        <section className="bg-slate-50 border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Çfarë përfshijnë shërbimet elektrike
            </h2>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              {[
                "Instalime elektrike të reja",
                "Riparime dhe mirëmbajtje",
                "Vendosje ndriçimi",
                "Panele elektrike dhe sigurime",
                "Instalime për pajisje shtëpiake",
                "Zgjidhje për efikasitet energjetik",
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
                Kur ke nevojë për elektricist?
              </h2>

              <p className="mt-6 text-lg text-slate-700">
                Nevoja për një elektricist lind në shumë situata – nga problemet
                e thjeshta deri te projektet e mëdha të ndërtimit apo renovimit.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl">
              {[
                "Ndërprerje të shpeshta të energjisë",
                "Instalime të vjetra",
                "Ndërtim ose renovim",
                "Ndriçim i ri",
                "Siguri elektrike",
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
                "Krahaso kompani dhe oferta",
                "Gjej profesionistë të besueshëm",
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
              "/lyerje",
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
                  Sa kushton një elektricist?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga lloji i punës dhe kompleksiteti.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">
                  A janë instalimet e vjetra të rrezikshme?
                </h4>
                <p className="text-slate-600">
                  Po, instalimet e vjetra mund të jenë të pasigurta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Gati për projektin tënd elektrik?
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