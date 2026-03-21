// src/pages/seo/NdertimMitrovice.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimMitrovice() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <meta name="robots" content="index, follow" />

        <title>
          Kompani ndërtimi në Mitrovicë | Ndërtim dhe renovim cilësor
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi në Mitrovicë për ndërtim shtëpish, renovim dhe projekte të ndryshme. Publiko projektin dhe merr oferta nga profesionistë të verifikuar."
        />

        <link
          rel="canonical"
          href="https://ndertimnet.com/ndertim/mitrovice"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Ndërtim në Mitrovicë | Ndertimnet" />
        <meta
          property="og:description"
          content="Gjej kompani ndërtimi në Mitrovicë dhe krahaso oferta për projektin tënd."
        />
        <meta
          property="og:url"
          content="https://ndertimnet.com/ndertim/mitrovice"
        />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* HERO */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Kompani ndërtimi në Mitrovicë
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Po kërkoni kompani ndërtimi në Mitrovicë për ndërtim shtëpie apo
          renovim banese? Ndertimnet ju ndihmon të gjeni profesionistë të
          besueshëm dhe të verifikuar në zonën tuaj.
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
            Ndërtim dhe renovim në Mitrovicë
          </h2>

          <p>
            Mitrovica është një nga qytetet kryesore në veri të Kosovës, me një
            treg ndërtimi që fokusohet kryesisht në ndërtimin e shtëpive
            familjare, renovime dhe projekte lokale. Kërkesa për kompani të
            besueshme mbetet e lartë, sidomos për projekte afatgjata dhe cilësore.
          </p>

          <p>
            Zgjedhja e një kompanie ndërtimi me përvojë është thelbësore për të
            siguruar që projekti juaj të realizohet sipas standardeve dhe në kohë.
          </p>

          {/* SECTION 2 */}
          <h2 className="text-2xl font-semibold">
            Çfarë shërbimesh ofrohen në Mitrovicë?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Ndërtim shtëpish familjare</li>
            <li>Renovim i brendshëm dhe i jashtëm</li>
            <li>Punime fasade dhe izolim</li>
            <li>Instalime elektrike dhe hidraulike</li>
            <li>Ndërtim objektesh të vogla afariste</li>
          </ul>

          {/* SECTION 3 */}
          <h2 className="text-2xl font-semibold">
            Si të gjeni ndërtues në Mitrovicë?
          </h2>

          <p>
            Me Ndertimnet, ju mund të publikoni projektin tuaj dhe të merrni
            oferta nga kompani ndërtimi që operojnë në Mitrovicë. Kjo ju lejon të
            krahasoni ofertat dhe të zgjidhni zgjidhjen më të përshtatshme për
            nevojat tuaja.
          </p>

          <p>
            Platforma jonë ju ndihmon të shmangni rreziqet dhe të merrni vendime
            të informuara.
          </p>

          {/* SECTION 4 */}
          <h2 className="text-2xl font-semibold">
            Zonat kryesore në Mitrovicë
          </h2>

          <p>
            Kompanitë ndërtimore operojnë në të gjithë rajonin e Mitrovicës,
            përfshirë:
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Mitrovicë Jugore</li>
            <li>Mitrovicë Veriore</li>
            <li>Vushtrri (zonë përreth)</li>
            <li>Skenderaj</li>
          </ul>

          {/* SECTION 5 */}
          <h2 className="text-2xl font-semibold">
            Pse të zgjidhni Ndertimnet?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Kompani të verifikuara dhe të besueshme</li>
            <li>Krahasim i ofertave në një vend</li>
            <li>Kursim kohe dhe reduktim i rrezikut</li>
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
            Filloni tani – Merr oferta për projektin tuaj
          </Link>
        </div>

      </div>
    </>
  );
}