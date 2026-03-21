// src/pages/seo/NdertimPrizren.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimPrizren() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <meta name="robots" content="index, follow" />

        <title>
          Kompani ndërtimi në Prizren | Ndërtim dhe renovim me cilësi
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi në Prizren për ndërtim dhe renovim banesash. Merr oferta nga profesionistë të verifikuar dhe krahaso çmimet."
        />

        <link
          rel="canonical"
          href="https://ndertimnet.com/ndertim/prizren"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Ndërtim në Prizren | Ndertimnet" />
        <meta
          property="og:description"
          content="Gjej kompani ndërtimi në Prizren dhe realizo projektin tënd me profesionistë lokalë."
        />
        <meta
          property="og:url"
          content="https://ndertimnet.com/ndertim/prizren"
        />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* HERO */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Kompani ndërtimi në Prizren
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Po kërkoni kompani ndërtimi në Prizren për renovim apo ndërtim?
          Ndertimnet ju ndihmon të gjeni profesionistë të besueshëm për projekte
          moderne dhe tradicionale.
        </p>

        {/* CTA */}
        <Link
          to="/login"
          className="inline-block bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-orange-600 transition"
        >
          Publiko projekt
        </Link>

        {/* ================= CONTENT ================= */}
        <div className="mt-16 space-y-6 text-gray-700">

          {/* SECTION 1 */}
          <h2 className="text-2xl font-semibold">
            Ndërtim dhe renovim në Prizren
          </h2>

          <p>
            Prizreni është një nga qytetet më të bukura dhe historike në Kosovë,
            me një arkitekturë unike dhe trashëgimi kulturore të pasur. Kjo e bën
            renovimin dhe ndërtimin në këtë qytet një proces që kërkon kujdes të
            veçantë dhe respekt për stilin ekzistues.
          </p>

          <p>
            Shumë projekte në Prizren fokusohen në renovimin e banesave ekzistuese
            duke ruajtur karakterin tradicional, ndërsa njëkohësisht integrojnë
            elemente moderne për komoditet.
          </p>

          {/* SECTION 2 */}
          <h2 className="text-2xl font-semibold">
            Çfarë shërbimesh ofrohen në Prizren?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Renovim i banesave tradicionale</li>
            <li>Ndërtim shtëpish dhe vilash moderne</li>
            <li>Restaurim dhe rikonstruksion objektesh</li>
            <li>Punime fasade dhe dekorative</li>
            <li>Instalime elektrike dhe hidraulike</li>
          </ul>

          {/* SECTION 3 */}
          <h2 className="text-2xl font-semibold">
            Si të gjeni ndërtues në Prizren?
          </h2>

          <p>
            Me Ndertimnet, ju mund të publikoni projektin tuaj dhe të merrni
            oferta nga kompani ndërtimi në Prizren. Kjo ju ndihmon të krahasoni
            çmimet dhe cilësinë e shërbimeve përpara se të merrni vendimin tuaj.
          </p>

          <p>
            Platforma ju jep transparencë dhe kontroll të plotë mbi projektin tuaj.
          </p>

          {/* SECTION 4 */}
          <h2 className="text-2xl font-semibold">
            Zonat kryesore në Prizren
          </h2>

          <p>
            Kompanitë ndërtimore operojnë në të gjitha zonat e qytetit dhe
            rrethinës, përfshirë:
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Qendra historike e Prizrenit</li>
            <li>Bazhdarhane</li>
            <li>Arbanë</li>
            <li>Ortakoll</li>
            <li>Reçan dhe zonat përreth</li>
          </ul>

          {/* SECTION 5 */}
          <h2 className="text-2xl font-semibold">
            Pse të zgjidhni Ndertimnet?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Kompani të verifikuara dhe me përvojë</li>
            <li>Krahasim i ofertave në një vend</li>
            <li>Kursim kohe dhe shmangie e rreziqeve</li>
            <li>Proces i thjeshtë dhe transparent</li>
          </ul>

          {/* INTERNAL LINKS */}
          <div className="pt-8 border-t">

            <h3 className="font-semibold mb-3">
              Shërbime të tjera
            </h3>

            <div className="flex flex-wrap gap-4 text-sm">

              <Link to="/renovim-banese" className="text-orange-500 hover:underline">
                Renovim banese
              </Link>

              <Link to="/kategori/elektricist" className="text-orange-500 hover:underline">
                Elektricist
              </Link>

              <Link to="/kategori/hidraulik" className="text-orange-500 hover:underline">
                Hidraulik
              </Link>

            </div>

          </div>

        </div>

        {/* FINAL CTA */}
        <div className="mt-16 text-center">
          <Link
            to="/login"
            className="bg-orange-500 text-white px-8 py-4 rounded-xl text-lg font-semibold"
          >
            Filloni tani – Publikoni projektin tuaj
          </Link>
        </div>

      </div>
    </>
  );
}