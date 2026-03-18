// src/pages/seo/NdertimVlore.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimVlore() {
  return (
    <>
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Kompani ndërtimi në Vlorë | Ndertimnet</title>
        <meta name="description" content="Kërkoni kompani ndërtimi në Vlorë? Merrni oferta nga profesionistë të verifikuar." />
        <link rel="canonical" href="https://ndertimnet.com/ndertim/vlore" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-6">Kompani ndërtimi në Vlorë</h1>

        <p className="text-lg text-gray-600 mb-8">
          Gjeni kompani ndërtimi dhe renovimi në Vlorë për projektin tuaj.
        </p>

        <Link to="/login" className="bg-orange-500 text-white px-6 py-3 rounded-lg">
          Publiko projekt
        </Link>
      </div>
    </>
  );
}