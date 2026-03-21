// src/pages/seo/NdertimDurres.jsx


import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimDurres() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <meta name="robots" content="index, follow" />

        <title>
          Kompani ndërtimi në Durrës | Ndërtim dhe renovim pranë detit
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi në Durrës për vila, apartamente dhe renovime. Publiko projektin dhe merr oferta nga profesionistë të verifikuar."
        />

        <link
          rel="canonical"
          href="https://ndertimnet.com/ndertim/durres"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Ndërtim në Durrës | Ndertimnet" />
        <meta
          property="og:description"
          content="Gjej kompani ndërtimi në Durrës dhe merr oferta për projektin tënd pranë detit."
        />
        <meta
          property="og:url"
          content="https://ndertimnet.com/ndertim/durres"
        />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* HERO */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Kompani ndërtimi në Durrës
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Po kërkoni kompani ndërtimi në Durrës për ndërtim apo renovim?
          Ndertimnet ju ndihmon të gjeni profesionistë të verifikuar për
          projekte banimi dhe turistike pranë detit.
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
            Ndërtim dhe renovim në Durrës
          </h2>

          <p>
            Durrësi është një nga qytetet më të rëndësishme bregdetare në
            Shqipëri dhe një nga zonat me rritjen më të shpejtë në sektorin e
            ndërtimit. Investimet në apartamente pushimi, vila dhe struktura
            turistike kanë rritur kërkesën për kompani ndërtimi profesionale.
          </p>

          <p>
            Ndërtimi pranë detit kërkon ekspertizë specifike, sidomos për
            materialet dhe izolimin, për të garantuar qëndrueshmëri dhe cilësi
            afatgjatë.
          </p>

          {/* SECTION 2 */}
          <h2 className="text-2xl font-semibold">
            Çfarë projektesh realizohen në Durrës?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Ndërtim vilash dhe apartamentesh pranë detit</li>
            <li>Renovim banesash për përdorim turistik</li>
            <li>Ndërtim hotelesh dhe objekte turistike</li>
            <li>Fasada dhe izolim kundër lagështisë</li>
            <li>Punime të brendshme dhe mobilim modern</li>
          </ul>

          {/* SECTION 3 */}
          <h2 className="text-2xl font-semibold">
            Si funksionon Ndertimnet?
          </h2>

          <p>
            Me Ndertimnet, procesi i gjetjes së një kompanie ndërtimi në Durrës
            bëhet shumë më i thjeshtë dhe transparent:
          </p>

          <ol className="list-decimal pl-6 space-y-2">
            <li>Publikoni projektin tuaj online</li>
            <li>Merrni oferta nga kompani të interesuara</li>
            <li>Krahasoni dhe zgjidhni ofertën më të mirë</li>
          </ol>

          {/* SECTION 4 */}
          <h2 className="text-2xl font-semibold">
            Zonat kryesore në Durrës
          </h2>

          <p>
            Kompanitë ndërtimore operojnë në të gjitha zonat kryesore si:
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Plazh (zona turistike kryesore)</li>
            <li>Qendër e Durrësit</li>
            <li>Shkëmbi i Kavajës</li>
            <li>Golem dhe Mali i Robit</li>
          </ul>

          {/* SECTION 5 */}
          <h2 className="text-2xl font-semibold">
            Pse të zgjidhni Ndertimnet?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Kompani të verifikuara dhe me eksperiencë</li>
            <li>Mundësi për të krahasuar oferta reale</li>
            <li>Kurseni kohë dhe shmangni rrezikun</li>
            <li>Platformë e thjeshtë dhe transparente</li>
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