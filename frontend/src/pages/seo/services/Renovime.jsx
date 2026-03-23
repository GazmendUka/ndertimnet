import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Wrench,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Home,
} from "lucide-react";

export default function Renovime() {
  return (
    <>
      <Helmet>
        <html lang="sq" />

        <title>Renovime në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej kompani për renovime të shtëpive dhe objekteve. Renovim banjo, kuzhine dhe më shumë."
        />

        <meta
          name="keywords"
          content="renovime, renovim shtëpie, renovim banjo, renovim kuzhine, rinovim"
        />

        <meta name="robots" content="index, follow" />

        <link rel="canonical" href="https://ndertimnet.com/renovime" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="border-b bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Home className="h-4 w-4" />
                Renovime profesionale
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight">
                Renovime për shtëpi dhe objekte
              </h1>

              <p className="mt-6 text-lg text-slate-600">
                Renovimi është mënyra më e mirë për të përmirësuar një hapësirë
                ekzistuese. Nga ndryshime të vogla deri te transformime të
                plota, renovimet rrisin komoditetin dhe vlerën e pronës.
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
            Çfarë përfshin një renovim?
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Renovimi përfshin përmirësimin e strukturës ekzistuese, instalimeve
            dhe pamjes së një hapësire. Ky proces mund të jetë i pjesshëm ose i
            plotë, në varësi të nevojave dhe buxhetit.
          </p>

          <p className="mt-6 text-lg leading-8 text-slate-700">
            Nga banjo dhe kuzhina deri te të gjithë ambienti i brendshëm,
            renovimi ndihmon në krijimin e një hapësire më moderne dhe më
            funksionale.
          </p>
        </section>

        {/* TYPES OF RENOVATIONS (SUPER VIKTIGT) */}
        <section className="bg-slate-50 border-y">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-3xl font-bold">
              Llojet e renovimeve
            </h2>

            <div className="mt-10 grid md:grid-cols-2 gap-6">
              <Link
                to="/renovim-banjo"
                className="p-6 bg-white rounded-xl border hover:shadow"
              >
                <h3 className="text-xl font-semibold">
                  Renovim banjo
                </h3>
                <p className="mt-2 text-slate-600">
                  Transformo banjon në një hapësirë moderne dhe funksionale.
                </p>
              </Link>

              <Link
                to="/renovim-kuzhine"
                className="p-6 bg-white rounded-xl border hover:shadow"
              >
                <h3 className="text-xl font-semibold">
                  Renovim kuzhine
                </h3>
                <p className="mt-2 text-slate-600">
                  Modernizo kuzhinën për komoditet dhe efikasitet.
                </p>
              </Link>

              <Link
                to="/dysheme"
                className="p-6 bg-white rounded-xl border hover:shadow"
              >
                <h3 className="text-xl font-semibold">
                  Dysheme
                </h3>
                <p className="mt-2 text-slate-600">
                  Ndrysho dyshemenë për një pamje të re.
                </p>
              </Link>

              <Link
                to="/lyerje"
                className="p-6 bg-white rounded-xl border hover:shadow"
              >
                <h3 className="text-xl font-semibold">
                  Lyerje
                </h3>
                <p className="mt-2 text-slate-600">
                  Fresko ambientin me ngjyra të reja.
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* WHEN */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold">
            Kur duhet të bësh renovim?
          </h2>

          <div className="mt-8 space-y-4">
            {[
              "Hapësira është e vjetëruar",
              "Instalimet janë të amortizuara",
              "Dëshiron stil modern",
              "Rritje e vlerës së pronës",
              "Përmirësim i komoditetit",
            ].map((item) => (
              <div key={item} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* INTERNAL LINKS */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h3 className="font-semibold mb-4">Shërbime të tjera</h3>

          <div className="flex flex-wrap gap-4">
            {[
              "/ndertime",
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
                  Sa kushton një renovim?
                </h4>
                <p className="text-slate-600">
                  Çmimi varet nga lloji i punimeve dhe materialet.
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
              Gati për të filluar renovimin?
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