// src/pages/seo/NdertimMitrovice.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimMitrovice() {
  return (
    <>
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Kompani ndërtimi në Mitrovicë | Ndertimnet</title>
        <meta name="description" content="Kërkoni kompani ndërtimi në Mitrovicë? Gjeni profesionistët më të mirë." />
        <link rel="canonical" href="https://ndertimnet.com/ndertim/mitrovice" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-6">Kompani ndërtimi në Mitrovicë</h1>

        <p className="text-lg text-gray-600 mb-8">
          Gjeni kompani ndërtimi dhe merrni oferta për projektet tuaja në Mitrovicë.
        </p>

        <Link to="/login" className="bg-orange-500 text-white px-6 py-3 rounded-lg">
          Publiko projekt
        </Link>
      </div>
    </>
  );
}