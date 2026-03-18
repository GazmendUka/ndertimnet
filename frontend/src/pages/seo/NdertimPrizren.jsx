// src/pages/seo/NdertimPrizren.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimPrizren() {
  return (
    <>
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Kompani ndërtimi në Prizren | Ndertimnet</title>
        <meta name="description" content="Gjej kompani ndërtimi në Prizren dhe merr oferta për projektin tënd." />
        <link rel="canonical" href="https://ndertimnet.com/ndertim/prizren" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-6">Kompani ndërtimi në Prizren</h1>

        <p className="text-lg text-gray-600 mb-8">
          Gjej kompani ndërtimi dhe profesionistë për renovim në Prizren.
        </p>

        <Link to="/login" className="bg-orange-500 text-white px-6 py-3 rounded-lg">
          Publiko projekt
        </Link>
      </div>
    </>
  );
}