// src/pages/seo/NdertimTirane.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimTirane() {
  return (
    <>
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Kompani ndërtimi në Tiranë | Gjej ndërtues</title>
        <meta name="description" content="Gjej kompani ndërtimi në Tiranë. Publiko projektin dhe merr oferta nga profesionistë të verifikuar." />
        <link rel="canonical" href="https://ndertimnet.com/ndertim/tirane" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-6">Kompani ndërtimi në Tiranë</h1>

        <p className="text-lg text-gray-600 mb-8">
          Kërkoni kompani ndërtimi në Tiranë? Ndertimnet ju ndihmon të gjeni ndërtues të besueshëm.
        </p>

        <Link to="/login" className="bg-orange-500 text-white px-6 py-3 rounded-lg">
          Publiko projekt
        </Link>

        <div className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">Ndërtim dhe renovim në Tiranë</h2>
          <p>Publikoni projektin dhe merrni oferta nga kompani ndërtimi në Tiranë.</p>
        </div>
      </div>
    </>
  );
}