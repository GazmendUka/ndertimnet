// ===========================================
// src/pages/LandingPage.jsx
// Ndertimnet – Production Marketplace Landing
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
          Ndertimnet – Gjej kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri
        </title>

        <meta
          name="description"
          content="Publiko projektin tënd dhe merr oferta nga kompani ndërtimi dhe renovimi të verifikuara në Kosovë dhe Shqipëri."
        />

        <meta property="og:type" content="website" />

        <meta
          property="og:title"
          content="Ndertimnet – Platformë për projekte ndërtimi"
        />

        <meta
          property="og:description"
          content="Platforma që lidh klientët me kompani ndërtimi dhe renovimi."
        />
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

        <section className="relative min-h-screen flex items-center bg-gray-900 text-white">

          <div className="max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-2 gap-12 items-center">

            <div>

              <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
                Gjej kompaninë e duhur për ndërtim dhe renovim
              </h1>

              <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl">
                Publiko projektin tënd dhe merr oferta nga kompani të
                verifikuara në zonën tënde.
              </p>

              <div className="flex gap-4 mb-8">

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

              <div className="flex gap-6 text-sm text-gray-300">

                <div>✔ Kompani të verifikuara</div>
                <div>✔ Projekte reale</div>
                <div>✔ Platformë e sigurt</div>

              </div>

            </div>

            {/* HERO MARKETING SPACE */}

            <div className="hidden md:flex items-center justify-center h-[420px] bg-gray-800 rounded-xl border border-gray-700 text-gray-400">
              Marketing / Featured Companies
            </div>

          </div>

        </section>

        {/* ================= TRUST BAR ================= */}

        <section className="bg-gray-100 py-8">

          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 text-center gap-6 text-sm">

            <div>✔ Kompani të verifikuara</div>
            <div>✔ Projekte reale</div>
            <div>✔ Kosovë & Shqipëri</div>
            <div>✔ Platformë e sigurt</div>

          </div>

        </section>

        {/* ================= HOW IT WORKS ================= */}

        <section id="how-it-works" className="py-24 bg-white">

          <div className="max-w-7xl mx-auto px-6 text-center">

            <h2 className="text-3xl font-bold mb-16">
              Si funksionon?
            </h2>

            <div className="grid md:grid-cols-3 gap-12">

              <div>
                <div className="text-4xl text-blue-600 mb-3">1</div>
                <h3 className="font-semibold mb-2">
                  Përshkruaj projektin
                </h3>
                <p className="text-gray-600">
                  Trego çfarë dëshiron të ndërtosh ose të renovosh.
                </p>
              </div>

              <div>
                <div className="text-4xl text-blue-600 mb-3">2</div>
                <h3 className="font-semibold mb-2">
                  Kompanitë njoftohen
                </h3>
                <p className="text-gray-600">
                  Kompanitë relevante marrin projektin tënd.
                </p>
              </div>

              <div>
                <div className="text-4xl text-blue-600 mb-3">3</div>
                <h3 className="font-semibold mb-2">
                  Merr oferta
                </h3>
                <p className="text-gray-600">
                  Krahaso ofertat dhe zgjidh kompaninë më të mirë.
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* ================= POPULAR CATEGORIES ================= */}

        <section className="py-24 bg-gray-50">

          <div className="max-w-7xl mx-auto px-6">

            <h2 className="text-3xl font-bold text-center mb-16">
              Kategori të njohura
            </h2>

            <div className="grid md:grid-cols-4 gap-10 text-center">

              <div className="p-6 border rounded-xl">
                <Hammer className="mx-auto mb-4"/>
                Elektricist
              </div>

              <div className="p-6 border rounded-xl">
                <Wrench className="mx-auto mb-4"/>
                Hidraulik
              </div>

              <div className="p-6 border rounded-xl">
                <Home className="mx-auto mb-4"/>
                Renovim banese
              </div>

              <div className="p-6 border rounded-xl">
                <Building className="mx-auto mb-4"/>
                Fasada
              </div>

            </div>

          </div>

        </section>

        {/* ================= FEATURED COMPANIES ================= */}

        <section className="py-24 bg-white">

          <div className="max-w-7xl mx-auto px-6">

            <h2 className="text-3xl font-bold text-center mb-16">
              Kompani të rekomanduara
            </h2>

            <div className="grid md:grid-cols-3 gap-10">

              {[1,2,3].map((item) => (

                <div
                  key={item}
                  className="border rounded-xl p-6 hover:shadow-lg transition"
                >

                  <div className="h-16 w-16 bg-gray-200 rounded mb-4"/>

                  <h3 className="font-semibold">
                    Kompania {item}
                  </h3>

                  <p className="text-sm text-gray-500 mb-3">
                    Renovime • Prishtinë
                  </p>

                  <div className="flex gap-1 text-yellow-500 mb-3">

                    <Star size={16}/>
                    <Star size={16}/>
                    <Star size={16}/>
                    <Star size={16}/>
                    <Star size={16}/>

                  </div>

                  <button className="text-blue-600 text-sm">
                    Shiko profilin
                  </button>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* ================= WHY NDERTIMNET ================= */}

        <section className="py-24 bg-gray-50">

          <div className="max-w-7xl mx-auto px-6 text-center">

            <h2 className="text-3xl font-bold mb-16">
              Pse Ndertimnet?
            </h2>

            <div className="grid md:grid-cols-4 gap-12">

              <div>
                <ShieldCheck className="mx-auto mb-4"/>
                Kompani të verifikuara
              </div>

              <div>
                <Users className="mx-auto mb-4"/>
                Mijëra përdorues
              </div>

              <div>
                <Briefcase className="mx-auto mb-4"/>
                Projekte reale
              </div>

              <div>
                <Star className="mx-auto mb-4"/>
                Shërbime cilësore
              </div>

            </div>

          </div>

        </section>

        {/* ================= CTA ================= */}

        <section className="py-24 bg-gray-900 text-white text-center">

          <h2 className="text-3xl font-bold mb-6">
            Gati të fillosh projektin?
          </h2>

          <p className="text-gray-300 mb-8">
            Publiko projektin tënd dhe merr oferta nga kompani të verifikuara.
          </p>

          <Link
            to="/login"
            className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200"
          >
            Publiko projekt
          </Link>

        </section>

        {/* ================= SEO CONTENT ================= */}

        <section className="py-24 bg-white">

          <div className="max-w-4xl mx-auto px-6 text-gray-600 leading-relaxed">

            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Platformë për ndërtim dhe renovim
            </h2>

            <p className="mb-4">
              Ndertimnet është një platformë moderne që lidh klientët me
              kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri.
            </p>

            <p>
              Publiko projektin tënd dhe merr oferta nga kompani të
              verifikuara dhe zgjidh ofertën më të mirë për projektin tënd.
            </p>

          </div>

        </section>

        {/* ================= FOOTER ================= */}

        <footer className="bg-gray-900 text-gray-300 py-12 text-center text-sm">

          © 2026 Ndertimnet

        </footer>

      </div>
    </>
  );
}