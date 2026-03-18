// src/pages/seo/NdertimPrishtine.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimPrishtine() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>
          Kompani ndërtimi në Prishtinë | Gjej ndërtues të verifikuar
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi në Prishtinë. Publiko projektin dhe merr oferta nga ndërtues profesionistë dhe të verifikuar."
        />

        <link
          rel="canonical"
          href="https://ndertimnet.com/ndertim/prishtine"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Ndërtim në Prishtinë | Ndertimnet" />
        <meta
          property="og:description"
          content="Gjej kompani ndërtimi në Prishtinë dhe merr oferta për projektin tënd."
        />
        <meta
          property="og:url"
          content="https://ndertimnet.com/ndertim/prishtine"
        />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* 🔥 H1 (SEO critical) */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Kompani ndërtimi në Prishtinë
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Kërkoni kompani ndërtimi në Prishtinë? Ndertimnet ju ndihmon të gjeni ndërtues të verifikuar për ndërtim dhe renovim.
        </p>

        {/* CTA */}
        <Link
          to="/login"
          className="inline-block bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-orange-600 transition"
        >
          Publiko projekt
        </Link>

        {/* CONTENT */}
        <div className="mt-16 space-y-6 text-gray-700">

          <h2 className="text-2xl font-semibold">
            Ndërtim dhe renovim në Prishtinë
          </h2>

          <p>
            Nëse planifikoni ndërtim shtëpie apo renovim banese në Prishtinë, është e rëndësishme të zgjidhni kompani ndërtimi profesionale dhe të besueshme.
          </p>

          <p>
            Në Ndertimnet, ju mund të publikoni projektin tuaj dhe të merrni oferta nga kompani ndërtimi të verifikuara në Prishtinë.
          </p>

          <p>
            Krahasoni ofertat, zgjidhni kompaninë më të mirë dhe realizoni projektin tuaj me siguri.
          </p>

          {/* 🔗 INTERNAL LINKS */}
          <div className="pt-6 border-t">

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

      </div>
    </>
  );
}