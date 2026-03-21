// src/pages/seo/NdertimTirane.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimTirane() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <meta name="robots" content="index, follow" />

        <title>
          Kompani ndërtimi në Tiranë | Ndërtim dhe renovim profesional
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi në Tiranë për ndërtim, renovim dhe projekte të mëdha. Publiko projektin dhe merr oferta nga profesionistë të verifikuar."
        />

        <link
          rel="canonical"
          href="https://ndertimnet.com/ndertim/tirane"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Ndërtim në Tiranë | Ndertimnet" />
        <meta
          property="og:description"
          content="Platforma për të gjetur kompani ndërtimi në Tiranë. Merr oferta dhe krahaso çmimet."
        />
        <meta
          property="og:url"
          content="https://ndertimnet.com/ndertim/tirane"
        />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* HERO */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Kompani ndërtimi në Tiranë
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Po kërkoni kompani ndërtimi në Tiranë për ndërtim apo renovim?
          Ndertimnet ju ndihmon të gjeni profesionistë të verifikuar për
          projekte banimi, afariste dhe zhvillime të mëdha urbane.
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
            Ndërtim dhe renovim në Tiranë
          </h2>

          <p>
            Tirana është qyteti me zhvillimin më të madh urban në Shqipëri,
            me një rritje të vazhdueshme të projekteve të ndërtimit. Nga
            komplekse banimi moderne deri tek ndërtesa afariste dhe projekte
            infrastrukturore, kërkesa për kompani ndërtimi profesionale është
            shumë e lartë.
          </p>

          <p>
            Për projekte të suksesshme në një treg kaq dinamik, është e rëndësishme
            të bashkëpunoni me kompani që ofrojnë cilësi, përvojë dhe
            profesionalizëm.
          </p>

          {/* SECTION 2 */}
          <h2 className="text-2xl font-semibold">
            Çfarë shërbimesh ofrohen në Tiranë?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Ndërtim apartamentesh dhe komplekse banimi</li>
            <li>Renovim i plotë i banesave</li>
            <li>Ndërtim objektesh afariste dhe zyra</li>
            <li>Fasada dhe izolim modern</li>
            <li>Instalime elektrike dhe hidraulike</li>
          </ul>

          {/* SECTION 3 */}
          <h2 className="text-2xl font-semibold">
            Si funksionon Ndertimnet?
          </h2>

          <p>
            Me Ndertimnet, ju mund të publikoni projektin tuaj dhe të merrni
            oferta nga kompani ndërtimi në Tiranë që janë të interesuara për
            realizimin e tij.
          </p>

          <p>
            Krahasoni ofertat, analizoni çmimet dhe zgjidhni kompaninë më të
            përshtatshme për projektin tuaj.
          </p>

          {/* SECTION 4 */}
          <h2 className="text-2xl font-semibold">
            Zonat kryesore në Tiranë
          </h2>

          <p>
            Kompanitë ndërtimore operojnë në të gjitha zonat kryesore të qytetit,
            përfshirë:
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Blloku</li>
            <li>Kombinat</li>
            <li>Don Bosko</li>
            <li>Ali Demi</li>
            <li>Lapraka</li>
          </ul>

          {/* SECTION 5 */}
          <h2 className="text-2xl font-semibold">
            Pse të zgjidhni Ndertimnet?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Kompani të verifikuara dhe profesionale</li>
            <li>Krahasim i ofertave në një vend</li>
            <li>Kursim kohe dhe vendimmarrje më e mirë</li>
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