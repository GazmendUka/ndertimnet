// ===========================================
// src/pages/LandingPage.jsx
// Ndertimnet – Production Landing Page v1
// ===========================================

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

export default function LandingPage() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <html lang="sq" />

        <title>
          Ndertimnet – Gjej kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri
        </title>

        <meta
          name="description"
          content="Publiko projektin tënd dhe merr oferta nga kompani ndërtimi dhe renovimi të verifikuara në Kosovë dhe Shqipëri."
        />

        <meta
          property="og:title"
          content="Ndertimnet – Platformë për ndërtim dhe renovim"
        />

        <meta
          property="og:description"
          content="Gjej kompani ndërtimi të verifikuara dhe merr oferta për projektin tënd."
        />

        <meta property="og:type" content="website" />
      </Helmet>

      <div className="w-full text-gray-900">

        {/* ================= HEADER ================= */}
        <header className="w-full bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

            <div className="text-2xl font-bold">
              Ndertimnet
            </div>

            <nav className="flex gap-6 text-sm font-medium">
              <Link to="/login" className="hover:text-blue-600">
                Kyçu
              </Link>

              <Link to="/about" className="hover:text-blue-600">
                Rreth nesh
              </Link>
            </nav>

          </div>
        </header>

        {/* ================= HERO ================= */}
        {/* HERO är byggd för att senare kunna bli en slider */}
        <section className="relative w-full min-h-screen flex items-center">

          {/* background */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 opacity-90" />

          <div className="relative max-w-7xl mx-auto px-6 py-32 w-full">

            <div className="grid md:grid-cols-2 gap-12 items-center">

              {/* LEFT SIDE */}
              <div className="text-white">

                <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                  Gjej kompaninë e duhur për ndërtim dhe renovim
                </h1>

                <p className="text-lg md:text-xl text-gray-200 max-w-xl mb-10">
                  Publiko projektin tënd dhe merr oferta nga kompani të
                  verifikuara në zonën tënde.
                </p>

                {/* CTA */}
                <div className="flex flex-wrap gap-4 mb-8">

                  <Link
                    to="/login"
                    className="bg-white text-gray-900 px-7 py-3 rounded-lg font-semibold hover:bg-gray-100"
                  >
                    Publiko projekt
                  </Link>

                  <a
                    href="#how-it-works"
                    className="border border-white px-7 py-3 rounded-lg font-semibold hover:bg-white hover:text-gray-900"
                  >
                    Si funksionon
                  </a>

                </div>

                {/* TRUST INDICATORS */}
                <div className="flex flex-wrap gap-6 text-sm text-gray-300">

                  <div>✔ Kompani të verifikuara</div>

                  <div>✔ Projekte reale</div>

                  <div>✔ Platformë e sigurt</div>

                </div>

              </div>

              {/* RIGHT SIDE */}
              {/* Marketing real estate (image / future ads) */}
              <div className="hidden md:block h-[420px] rounded-xl bg-gray-800 bg-opacity-40 border border-gray-700 flex items-center justify-center text-gray-400">

                Marketing Space
                <br />
                (Hero image / featured company)

              </div>

            </div>

          </div>

        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section id="how-it-works" className="py-24 bg-gray-50">

          <div className="max-w-7xl mx-auto px-6 text-center">

            <h2 className="text-3xl font-bold mb-16">
              Si funksionon?
            </h2>

            <div className="grid md:grid-cols-3 gap-12">

              <div>

                <div className="text-4xl font-bold text-blue-600 mb-4">
                  1
                </div>

                <h3 className="font-semibold text-lg mb-2">
                  Përshkruaj projektin
                </h3>

                <p className="text-gray-600">
                  Trego çfarë dëshiron të ndërtosh ose të renovosh.
                </p>

              </div>

              <div>

                <div className="text-4xl font-bold text-blue-600 mb-4">
                  2
                </div>

                <h3 className="font-semibold text-lg mb-2">
                  Kompanitë njoftohen
                </h3>

                <p className="text-gray-600">
                  Vetëm kompani relevante dhe lokale marrin projektin.
                </p>

              </div>

              <div>

                <div className="text-4xl font-bold text-blue-600 mb-4">
                  3
                </div>

                <h3 className="font-semibold text-lg mb-2">
                  Merr oferta & zgjidh
                </h3>

                <p className="text-gray-600">
                  Krahaso ofertat dhe zgjidh pa presion.
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ================= FOR WHO ================= */}
        <section className="py-24 bg-white">

          <div className="max-w-7xl mx-auto px-6">

            <h2 className="text-3xl font-bold text-center mb-16">
              Për kë është Ndertimnet?
            </h2>

            <div className="grid md:grid-cols-2 gap-12">

              <div className="border rounded-xl p-8">

                <h3 className="text-xl font-semibold mb-4">
                  Për klientë privatë
                </h3>

                <ul className="space-y-3 text-gray-600">

                  <li>• Publikim falas i projektit</li>
                  <li>• Krahaso oferta nga kompani lokale</li>
                  <li>• Transparencë dhe kontroll i plotë</li>

                </ul>

              </div>

              <div className="border rounded-xl p-8">

                <h3 className="text-xl font-semibold mb-4">
                  Për kompani ndërtimi
                </h3>

                <ul className="space-y-3 text-gray-600">

                  <li>• Projekte reale nga klientë</li>
                  <li>• Paguan vetëm kur dëshiron kontakt</li>
                  <li>• Platformë moderne për të gjetur punë</li>

                </ul>

              </div>

            </div>

          </div>

        </section>

        {/* ================= WHY NDERTIMNET ================= */}
        <section className="py-24 bg-gray-50">

          <div className="max-w-7xl mx-auto px-6 text-center">

            <h2 className="text-3xl font-bold mb-12">
              Pse Ndertimnet?
            </h2>

            <div className="grid md:grid-cols-3 gap-8 text-gray-700">

              <div>✔️ Kompani lokale të verifikuara</div>

              <div>✔️ Projekte reale nga klientë</div>

              <div>✔️ Pa ndërmjetës dhe pa stres</div>

              <div>✔️ Komunikim i drejtpërdrejtë</div>

              <div>✔️ Platformë e sigurt</div>

              <div>✔️ Zgjidh ofertën më të mirë</div>

            </div>

          </div>

        </section>

        {/* ================= CTA ================= */}
        <section className="py-24 bg-gray-900 text-white text-center">

          <div className="max-w-3xl mx-auto px-6">

            <h2 className="text-3xl font-bold mb-6">
              Gati të fillosh projektin?
            </h2>

            <p className="text-gray-300 mb-8">
              Publiko projektin tënd falas dhe merr oferta nga kompani të
              verifikuara.
            </p>

            <Link
              to="/login"
              className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200"
            >
              Publiko projekt
            </Link>

          </div>

        </section>

        {/* ================= SEO CONTENT ================= */}
        <section className="py-20 bg-white">

          <div className="max-w-4xl mx-auto px-6 text-gray-600 leading-relaxed">

            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Platformë për ndërtim dhe renovim
            </h2>

            <p className="mb-4">
              Ndertimnet është një platformë moderne që lidh klientët me
              kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri. Qëllimi ynë
              është të bëjmë procesin e gjetjes së profesionistëve të ndërtimit
              më të thjeshtë dhe më transparent.
            </p>

            <p>
              Publiko projektin tënd dhe merr oferta nga kompani të
              verifikuara. Krahaso ofertat dhe zgjidh zgjidhjen më të mirë për
              projektin tënd të ndërtimit ose renovimit.
            </p>

          </div>

        </section>

        {/* ================= FOOTER ================= */}
        <footer className="bg-gray-900 text-gray-300 py-12">

          <div className="max-w-7xl mx-auto px-6 flex justify-between text-sm">

            <div>

              <div className="text-lg font-bold text-white">
                Ndertimnet
              </div>

              <p className="mt-2">
                © 2026 Ndertimnet. Të gjitha të drejtat e rezervuara.
              </p>

            </div>

            <div className="flex gap-6 items-center">

              <Link to="/login" className="hover:text-white">
                Kyçu
              </Link>

              <Link to="/about" className="hover:text-white">
                Rreth nesh
              </Link>

            </div>

          </div>

        </footer>

      </div>
    </>
  );
}