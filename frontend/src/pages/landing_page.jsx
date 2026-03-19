// ===========================================
// src/pages/LandingPage.jsx
// Ndertimnet – Landing Page v3.2 (MAX SEO)
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

        {/* PRIMARY SEO */}
        <title>
          Kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri | Ndertimnet
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri. Publiko projektin dhe merr oferta nga ndërtues të verifikuar në Prishtinë, Tiranë dhe më shumë."
        />

        <meta name="robots" content="index, follow" />
        <meta property="og:locale" content="sq_AL" />
        <meta property="og:site_name" content="Ndertimnet" />
        <meta name="twitter:site" content="@ndertimnet" />
        <meta property="og:image:alt" content="Ndertimnet platform për ndërtim dhe renovim" />
        <meta name="twitter:image" content="https://ndertimnet.com/og-image.jpg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="canonical" href="https://ndertimnet.com/" />

        {/* OPEN GRAPH */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Gjej kompani ndërtimi dhe renovimi | Ndertimnet"
        />
        <meta
          property="og:description"
          content="Publiko projektin dhe merr oferta nga kompani ndërtimi të verifikuara."
        />
        <meta
          property="og:image"
          content="https://ndertimnet.com/og-image.jpg"
        />
        <meta property="og:url" content="https://ndertimnet.com/" />

        {/* TWITTER */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ndertimnet – Ndërtim dhe renovim" />
        <meta
          name="twitter:description"
          content="Platforma që lidh klientët me kompani ndërtimi dhe renovimi."
        />

        {/* STRUCTURED DATA */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "Ndertimnet",
                url: "https://ndertimnet.com",
                logo: "https://ndertimnet.com/logo.png",
              },
              {
                "@type": "WebSite",
                url: "https://ndertimnet.com",
                potentialAction: {
                  "@type": "SearchAction",
                  target:
                    "https://ndertimnet.com/search?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "Service",
                name: "Ndërtim dhe renovim",
                areaServed: ["Kosovë", "Shqipëri"],
                provider: {
                  "@type": "Organization",
                  name: "Ndertimnet",
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <div className="w-full text-gray-900">

        {/* ================= HEADER ================= */}
        <header className="w-full bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
            <div className="text-2xl font-semibold">Ndertimnet</div>
            <nav className="flex gap-6 text-sm">
              <Link to="/login">Kyçu</Link>
              <Link to="/about">Rreth nesh</Link>
            </nav>
          </div>
        </header>

        {/* ================= HERO ================= */}
        <section className="bg-white py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">

            <div>
              {/* 🔥 SEO H1 */}
              <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
                Gjej <span className="text-orange-500">kompani ndërtimi</span> dhe renovimi
                në Kosovë dhe Shqipëri
              </h1>

              <p className="text-lg text-gray-600 mb-10 max-w-lg">
                Publiko projektin tënd dhe merr oferta nga kompani ndërtimi në Kosovë dhe Shqipëri.
              </p>

              {/* 🔗 INTERNAL LINKS */}
              <div className="flex gap-4 text-sm text-gray-500 mb-6 flex-wrap">
                <Link to="/kategori/ndertim">Ndërtim</Link>
                <Link to="/kategori/renovim">Renovim</Link>
                <Link to="/kategori/elektricist">Elektricist</Link>
                <Link to="/kategori/hidraulik">Hidraulik</Link>
              </div>

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

            <div className="grid grid-cols-2 gap-4">

              {/* BIG IMAGE */}
              <img
                src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80"
                className="rounded-xl h-[260px] w-full object-cover col-span-2 shadow-sm hover:shadow-lg hover:scale-105 transition duration-300"
                alt="Construction site"
              />

              {/* SMALL LEFT */}
              <img
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80"
                className="rounded-xl h-[180px] w-full object-cover shadow-sm hover:shadow-lg hover:scale-105 transition duration-300"
                alt="Construction workers"
              />

              {/* SMALL RIGHT */}
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80"
                className="rounded-xl h-[180px] w-full object-cover shadow-sm hover:shadow-lg hover:scale-105 transition duration-300"
                alt="Interior renovation"
              />

            </div>

          </div>
        </section>

        {/* ================= TRUST ================= */}
        <section className="border-t border-b py-6 bg-gray-50 text-sm text-center">
          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-6">
            <div>✔ Kompani të verifikuara</div>
            <div>✔ Projekte reale</div>
            <div>✔ Kosovë dhe Shqipëri</div>
            <div>✔ Platformë e sigurt</div>
          </div>
        </section>

        {/* ================= HOW ================= */}
        <section id="how-it-works" className="py-32">
          <div className="max-w-6xl mx-auto text-center px-6">

            <h2 className="text-4xl font-bold mb-16">
              Si funksionon Ndertimnet?
            </h2>

            <div className="grid md:grid-cols-3 gap-16">

              <div>
                <h3 className="font-semibold mb-2">Publiko projektin</h3>
                <p className="text-gray-600">
                  Përshkruaj projektin tënd të ndërtimit ose renovimit.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Merr oferta</h3>
                <p className="text-gray-600">
                  Kompanitë ndërtimore kontaktojnë me ofertat e tyre.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Zgjidh kompaninë</h3>
                <p className="text-gray-600">
                  Krahaso dhe zgjedh ofertën më të mirë.
                </p>
              </div>

            </div>
          </div>
        </section>


        {/* ================== CITIES ================== */}  
        <section className="py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6 text-center">

            <h2 className="text-3xl font-bold mb-12">
              Kompani ndërtimi në qytetet kryesore
            </h2>

            <div className="grid md:grid-cols-3 gap-6">

              <Link to="/ndertim/prishtine" aria-label="Kompani ndërtimi në Prishtinë" className="bg-white p-6 rounded-xl border hover:shadow-md transition">
                <div className="font-semibold text-lg">Prishtinë</div>
                <div className="text-sm text-gray-500 mt-1">Kompani ndërtimi</div>
              </Link>

              <Link to="/ndertim/tirane" aria-label="Kompani ndërtimi në Tiranë" className="bg-white p-6 rounded-xl border hover:shadow-md transition">
                <div className="font-semibold text-lg">Tiranë</div>
                <div className="text-sm text-gray-500 mt-1">Kompani ndërtimi</div>
              </Link>

              <Link to="/ndertim/prizren" aria-label="Kompani ndërtimi në Prizren" className="bg-white p-6 rounded-xl border hover:shadow-md transition">
                <div className="font-semibold text-lg">Prizren</div>
                <div className="text-sm text-gray-500 mt-1">Kompani ndërtimi</div>
              </Link>

              <Link to="/ndertim/durres" aria-label="Kompani ndërtimi në Durrës" className="bg-white p-6 rounded-xl border hover:shadow-md transition">
                <div className="font-semibold text-lg">Durrës</div>
                <div className="text-sm text-gray-500 mt-1">Kompani ndërtimi</div>
              </Link>

              <Link to="/ndertim/mitrovice" aria-label="Kompani ndërtimi në Mitrovicë" className="bg-white p-6 rounded-xl border hover:shadow-md transition">
                <div className="font-semibold text-lg">Mitrovicë</div>
                <div className="text-sm text-gray-500 mt-1">Kompani ndërtimi</div>
              </Link>

              <Link to="/ndertim/vlore" aria-label="Kompani ndërtimi në Vlorë" className="bg-white p-6 rounded-xl border hover:shadow-md transition">
                <div className="font-semibold text-lg">Vlorë</div>
                <div className="text-sm text-gray-500 mt-1">Kompani ndërtimi</div>
              </Link>

            </div>

          </div>
        </section>

        {/* ================= SERVICES ================= */}
        <section className="py-32 bg-white">
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
        <section className="py-32 bg-gray-50">
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
              Kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri
            </h2>

            <p className="mb-4">
              Ndertimnet është platformë që ju ndihmon të gjeni kompani ndërtimi dhe profesionistë për renovim banese në Kosovë dhe Shqipëri.
            </p>

            <p className="mb-4">
              Publikoni projektin dhe merrni oferta nga ndërtues të verifikuar në Prishtinë, Tiranë dhe qytete të tjera.
            </p>

            <p>
              Krahaso ofertat dhe zgjedh zgjidhjen më të mirë për projektin tuaj.
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