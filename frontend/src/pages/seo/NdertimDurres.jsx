// src/pages/seo/NdertimDurres.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimDurres() {
  return (
    <>
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Kompani ndërtimi në Durrës | Ndertimnet</title>
        <meta name="description" content="Gjej kompani ndërtimi në Durrës dhe fillo projektin tënd sot." />
        <link rel="canonical" href="https://ndertimnet.com/ndertim/durres" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-6">Kompani ndërtimi në Durrës</h1>

        <p className="text-lg text-gray-600 mb-8">
          Gjeni ndërtues profesionistë për ndërtim dhe renovim në Durrës.
        </p>

        <Link to="/login" className="bg-orange-500 text-white px-6 py-3 rounded-lg">
          Publiko projekt
        </Link>
      </div>
    </>
  );
}