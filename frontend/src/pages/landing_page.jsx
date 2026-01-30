// ===========================================
// src/pages/landing_page.jsx
// Ndertimnet v1.0 – Landing Page + Soft SEO
// ===========================================

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

export default function LandingPage() {
  return (
    <>
      {/* ================= SEO (SOFT) ================= */}
      <Helmet>
        <html lang="sq" />
        <title>Ndertimnet – Platformë për ndërtim dhe renovim</title>
        <meta
          name="description"
          content="Ndertimnet lidh klientët me kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri. Gjej profesionistë lokalë dhe zgjidh ofertën e duhur për projektin tënd."
        />
        <meta property="og:title" content="Ndertimnet – Platformë për ndërtim dhe renovim" />
        <meta
          property="og:description"
          content="Gjej kompani ndërtimi të verifikuara dhe merr oferta për projektin tënd në Kosovë dhe Shqipëri."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="w-full text-gray-900">

        {/* ================= TOP BAR ================= */}
        <header className="w-full bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-2xl font-bold">Ndertimnet</div>
            <nav className="flex gap-6 text-sm font-medium">
              <Link to="/login" className="hover:text-blue-600">Kyçu</Link>
              <Link to="/about" className="hover:text-blue-600">Rreth nesh</Link>
            </nav>
          </div>
        </header>

        {/* ================= HERO + MAIN MARKETING ================= */}
        <section className="relative w-full min-h-[85vh]">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 opacity-90" />

          <div className="relative max-w-7xl mx-auto px-6 py-32 h-full flex items-center">
            <div className="grid md:grid-cols-2 gap-12 w-full">

              {/* HERO TEXT – LEFT */}
              <div className="text-left text-white">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
                  Gjej kompaninë e duhur për ndërtim dhe renovim
                </h1>
                <p className="text-lg md:text-xl text-gray-200 max-w-xl mb-10">
                  Publiko projektin tënd dhe merr oferta nga kompani të verifikuara në zonën tënde.
                </p>
                <Link
                  to="/login"
                  className="inline-block bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
                >
                  Kyçu
                </Link>
              </div>

              {/* MARKETING REAL ESTATE – RIGHT (EMPTY ON PURPOSE) */}
              <div className="hidden md:block" />

            </div>
          </div>
        </section>

        {/* ================= SI FUNKSIONON ================= */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-12">Si funksionon?</h2>

            <div className="grid md:grid-cols-3 gap-10">
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-4">1</div>
                <h3 className="font-semibold text-lg mb-2">Përshkruaj projektin</h3>
                <p className="text-gray-600">
                  Trego çfarë dëshiron të ndërtosh ose të renovosh.
                </p>
              </div>

              <div>
                <div className="text-4xl font-bold text-blue-600 mb-4">2</div>
                <h3 className="font-semibold text-lg mb-2">Kompanitë njoftohen</h3>
                <p className="text-gray-600">
                  Vetëm kompani relevante dhe lokale marrin projektin.
                </p>
              </div>

              <div>
                <div className="text-4xl font-bold text-blue-600 mb-4">3</div>
                <h3 className="font-semibold text-lg mb-2">Merr oferta & zgjidh</h3>
                <p className="text-gray-600">
                  Krahaso ofertat dhe zgjidh pa presion.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PER KE ESHTE ================= */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12">
              Për kë është Ndertimnet?
            </h2>

            <div className="grid md:grid-cols-2 gap-12">

              <div className="border rounded-xl p-8">
                <h3 className="text-xl font-semibold mb-4">🏠 Për klientë privatë</h3>
                <ul className="space-y-2 text-gray-600 mb-6">
                  <li>• Publikim falas i projektit</li>
                  <li>• Pa telefonata të padëshiruara</li>
                  <li>• Transparencë dhe kontroll i plotë</li>
                </ul>
              </div>

              <div className="border rounded-xl p-8">
                <h3 className="text-xl font-semibold mb-4">🏗️ Për kompani ndërtimi</h3>
                <ul className="space-y-2 text-gray-600 mb-6">
                  <li>• Projekte reale</li>
                  <li>• Paguan vetëm kur dëshiron kontakt</li>
                  <li>• Platformë moderne dhe e thjeshtë</li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* ================= PSE NDERTIMNET ================= */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-10">Pse Ndertimnet?</h2>

            <div className="grid md:grid-cols-3 gap-6 text-gray-700">
              <div>✔️ Kompani lokale</div>
              <div>✔️ Profile të verifikuara</div>
              <div>✔️ Pa stres dhe pa ndërmjetës</div>
              <div>✔️ Komunikim i drejtpërdrejtë</div>
              <div>✔️ Platformë e sigurt dhe moderne</div>
            </div>
          </div>
        </section>

        {/* ================= GOOGLE ADS PLACEHOLDER ================= */}
        <section className="py-12 bg-gray-100">
          <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
            Hapësirë për reklama (Google Ads – implementim i mëvonshëm)
          </div>
        </section>

        {/* ================= FOOTER ================= */}
        <footer className="bg-gray-900 text-gray-300 py-10">
          <div className="max-w-7xl mx-auto px-6 flex justify-between text-sm">
            <div>
              <div className="text-lg font-bold text-white">Ndertimnet</div>
              <p className="mt-2">
                © 2026 Ndertimnet. Të gjitha të drejtat e rezervuara.
              </p>
            </div>
            <div className="flex gap-6 items-center">
              <Link to="/login" className="hover:text-white">Kyçu</Link>
              <Link to="/about" className="hover:text-white">Rreth nesh</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
