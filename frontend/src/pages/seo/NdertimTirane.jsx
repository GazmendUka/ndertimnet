// src/pages/seo/NdertimTirane.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimTirane() {
  return (
    <>
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Kompani ndërtimi në Tiranë | Ndërtues dhe renovim</title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi në Tiranë për ndërtim, renovim dhe projekte të ndryshme. Publiko projektin dhe merr oferta nga profesionistë të verifikuar."
        />

        <link rel="canonical" href="https://ndertimnet.com/ndertim/tirane" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* HERO */}
        <h1 className="text-4xl font-bold mb-6">
          Kompani ndërtimi në Tiranë
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Po kërkoni kompani ndërtimi në Tiranë për një projekt të ri apo renovim?
          Ndertimnet ju ndihmon të gjeni profesionistë të besueshëm, të verifikuar
          dhe të gatshëm për të realizuar projektin tuaj.
        </p>

        <Link
          to="/login"
          className="bg-orange-500 text-white px-6 py-3 rounded-lg"
        >
          Publiko projekt
        </Link>

        {/* SECTION 1 */}
        <div className="mt-16 space-y-4">
          <h2 className="text-2xl font-semibold">
            Ndërtim dhe renovim në Tiranë
          </h2>

          <p>
            Tirana është një nga qytetet me zhvillimin më të shpejtë në rajon,
            me kërkesë të lartë për ndërtim dhe renovim. Nga apartamente moderne
            deri tek vila dhe objekte komerciale, tregu i ndërtimit në Tiranë
            kërkon kompani serioze dhe profesionale.
          </p>

          <p>
            Me Ndertimnet, ju mund të publikoni projektin tuaj dhe të merrni
            oferta nga kompani ndërtimi që operojnë në Tiranë dhe zonat përreth.
          </p>
        </div>

        {/* SECTION 2 */}
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">
            Çfarë shërbimesh ofrojnë kompanitë në Tiranë?
          </h2>

          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Ndërtim shtëpish dhe vilash</li>
            <li>Renovim apartamentesh</li>
            <li>Punime fasade dhe izolim</li>
            <li>Punime elektrike dhe hidraulike</li>
            <li>Projekte komerciale dhe industriale</li>
          </ul>
        </div>

        {/* SECTION 3 */}
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">
            Si funksionon Ndertimnet?
          </h2>

          <p>
            Platforma jonë e bën procesin e gjetjes së një ndërtuesi shumë më të
            thjeshtë:
          </p>

          <ol className="list-decimal pl-6 space-y-2 text-gray-700">
            <li>Publikoni projektin tuaj</li>
            <li>Merrni oferta nga kompani të interesuara</li>
            <li>Krahasoni ofertat dhe zgjidhni më të mirën</li>
          </ol>
        </div>

        {/* SECTION 4 */}
        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">
            Pse të zgjidhni Ndertimnet?
          </h2>

          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Kompani të verifikuara</li>
            <li>Krahasim i ofertave në një vend</li>
            <li>Kursim kohe dhe parash</li>
            <li>Proces i thjeshtë dhe transparent</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            to="/login"
            className="bg-orange-500 text-white px-8 py-4 rounded-xl text-lg"
          >
            Filloni tani – Publikoni projektin tuaj
          </Link>
        </div>

      </div>
    </>
  );
}