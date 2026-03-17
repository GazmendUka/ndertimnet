// ===========================================
// src/pages/LandingPage.jsx
// Ndertimnet – Landing Page v3.1 (SEO + Premium UX)
// ===========================================

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ShieldCheck,
  Users,
  Briefcase,
  Star,
  Hammer,
  Wrench,
  Home,
  Building,
} from "lucide-react";

export default function LandingPage() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <html lang="sq" />

        <title>
          Ndertimnet – Ndërtim dhe renovim në Kosovë dhe Shqipëri
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri. Publiko projektin dhe merr oferta nga profesionistë të verifikuar."
        />

        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="canonical" href="https://ndertimnet.com/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Ndertimnet – Ndërtim dhe renovim" />
        <meta
          property="og:description"
          content="Platforma që lidh klientët me kompani ndërtimi dhe renovimi."
        />
        <meta
          property="og:image"
          content="https://ndertimnet.com/og-image.jpg"
        />
        <meta property="og:url" content="https://ndertimnet.com/" />

        {/* Basic structured data */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Ndertimnet",
              "url": "https://ndertimnet.com"
            }
          `}
        </script>
      </Helmet>

      <div className="w-full text-gray-900">

        {/* ================= HEADER ================= */}
        <header className="w-full bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
            <div className="text-2xl font-semibold">Ndertimnet</div>
            <div className="flex gap-6 text-sm">
              <Link to="/login">Kyçu</Link>
              <Link to="/about">Rreth nesh</Link>
            </div>
          </div>
        </header>

        {/* ================= HERO ================= */}
        <section className="bg-white py-32">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">

            <div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
                Ndërtim dhe renovim me{" "}
                <span className="text-orange-500">
                  kompani të verifikuara
                </span>
              </h1>

              <p className="text-lg text-gray-600 mb-10 max-w-lg">
                Publiko projektin tënd dhe merr oferta nga kompani ndërtimi në Kosovë dhe Shqipëri.
              </p>

              <div className="flex gap-4 mb-6">
                <Link
                  to="/login"
                  className="bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-orange-600 transition"
                >
                  Publiko projekt
                </Link>

                <a
                  href="#how-it-works"
                  className="border px-8 py-4 rounded-xl font-semibold hover:bg-gray-100"
                >
                  Si funksionon
                </a>
              </div>

              <div className="text-sm text-gray-500 flex gap-6">
                <span>✔ Kompani të verifikuara</span>
                <span>✔ Projekte reale</span>
                <span>✔ Falas</span>
              </div>
            </div>

            <div className="bg-gray-100 rounded-2xl p-10 h-[420px] flex items-center justify-center text-gray-400">
              Marketing / Featured Companies
            </div>

          </div>
        </section>

        {/* ================= TRUST STRIP ================= */}
        <section className="border-t border-b py-6 bg-gray-50 text-sm text-center">
          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-6">
            <div>✔ Kompani të verifikuara</div>
            <div>✔ Projekte reale</div>
            <div>✔ Kosovë & Shqipëri</div>
            <div>✔ Platformë e sigurt</div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section id="how-it-works" className="py-32">
          <div className="max-w-6xl mx-auto text-center px-6">

            <h2 className="text-4xl font-bold mb-16">
              Si funksionon Ndertimnet?
            </h2>

            <div className="grid md:grid-cols-3 gap-16">

              <div>
                <div className="text-3xl mb-4">1</div>
                <h3 className="font-semibold mb-2">
                  Publiko projektin
                </h3>
                <p className="text-gray-600">
                  Përshkruaj projektin tënd të ndërtimit ose renovimit.
                </p>
              </div>

              <div>
                <div className="text-3xl mb-4">2</div>
                <h3 className="font-semibold mb-2">
                  Merr oferta
                </h3>
                <p className="text-gray-600">
                  Kompanitë ndërtimore kontaktojnë me ofertat e tyre.
                </p>
              </div>

              <div>
                <div className="text-3xl mb-4">3</div>
                <h3 className="font-semibold mb-2">
                  Zgjidh kompaninë
                </h3>
                <p className="text-gray-600">
                  Krahaso dhe zgjedh ofertën më të mirë.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ================= CATEGORIES ================= */}
        <section className="py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 text-center">

            <h2 className="text-3xl font-bold mb-16">
              Shërbime ndërtimi dhe renovimi
            </h2>

            <div className="grid md:grid-cols-4 gap-8">

              {[Hammer, Wrench, Home, Building].map((Icon, i) => (
                <div key={i} className="bg-white p-8 rounded-xl border hover:shadow-md transition">
                  <Icon className="mx-auto mb-4" />
                  <p>Shërbim ndërtimi</p>
                </div>
              ))}

            </div>
          </div>
        </section>

        {/* ================= WHY ================= */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-6 text-center">

            <h2 className="text-3xl font-bold mb-16">
              Pse të zgjedhësh Ndertimnet?
            </h2>

            <div className="grid md:grid-cols-4 gap-10">

              <div><ShieldCheck className="mx-auto mb-4"/>Kompani të verifikuara</div>
              <div><Users className="mx-auto mb-4"/>Përdorues aktiv</div>
              <div><Briefcase className="mx-auto mb-4"/>Projekte reale</div>
              <div><Star className="mx-auto mb-4"/>Shërbime cilësore</div>

            </div>

          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="py-32 bg-gray-900 text-white text-center">

          <h2 className="text-4xl font-bold mb-6">
            Filloni projektin tuaj sot
          </h2>

          <p className="text-gray-300 mb-8">
            Merrni oferta nga kompani ndërtimi dhe renovimi.
          </p>

          <Link
            to="/login"
            className="bg-orange-500 px-10 py-4 rounded-xl font-semibold hover:bg-orange-600"
          >
            Publiko projekt
          </Link>

        </section>

        {/* ================= SEO CONTENT ================= */}
        <section className="py-24 bg-white">

          <div className="max-w-4xl mx-auto px-6 text-gray-600 leading-relaxed">

            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Ndërtim dhe renovim në Kosovë dhe Shqipëri
            </h2>

            <p className="mb-4">
              Ndertimnet është platformë moderne që lidh klientët me kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri. Nëse kërkoni kompani ndërtimi, renovim banese, instalime elektrike apo hidraulike, Ndertimnet ju ndihmon të gjeni profesionistët më të mirë.
            </p>

            <p>
              Publikoni projektin tuaj dhe merrni oferta nga kompani ndërtimi në Prishtinë, Tiranë dhe qytete tjera. Krahaso ofertat dhe zgjedh zgjidhjen më të mirë për projektin tuaj.
            </p>

          </div>

        </section>

        {/* ================= FOOTER ================= */}
        <footer className="py-10 text-center text-sm text-gray-500">
          © 2026 Ndertimnet
        </footer>

      </div>
    </>
  );
}