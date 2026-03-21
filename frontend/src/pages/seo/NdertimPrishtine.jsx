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
          Kompani ndërtimi në Prishtinë | Ndërtim dhe renovim profesional
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi në Prishtinë për ndërtim shtëpie, renovim banese dhe projekte të tjera. Publiko projektin dhe merr oferta nga profesionistë të verifikuar."
        />

        <link
          rel="canonical"
          href="https://ndertimnet.com/ndertim/prishtine"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Ndërtim në Prishtinë | Ndertimnet" />
        <meta
          property="og:description"
          content="Platforma për të gjetur kompani ndërtimi në Prishtinë. Merr oferta dhe krahaso çmimet."
        />
        <meta
          property="og:url"
          content="https://ndertimnet.com/ndertim/prishtine"
        />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* HERO */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Kompani ndërtimi në Prishtinë
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Po kërkoni kompani ndërtimi në Prishtinë për ndërtim, renovim apo
          projekte të tjera? Ndertimnet ju ndihmon të lidheni me kompani të
          besueshme dhe të verifikuara në treg.
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
            Ndërtim dhe renovim në Prishtinë
          </h2>

          <p>
            Prishtina është qendra kryesore ekonomike në Kosovë dhe një nga
            qytetet me zhvillimin më të shpejtë në ndërtim. Nga ndërtesa të reja
            banimi deri tek renovime moderne të apartamenteve, kërkesa për
            kompani ndërtimi profesionale është në rritje të vazhdueshme.
          </p>

          <p>
            Për të siguruar një rezultat cilësor, është e rëndësishme të punoni
            me kompani që kanë përvojë dhe reputacion të mirë në tregun lokal.
          </p>

          {/* SECTION 2 */}
          <h2 className="text-2xl font-semibold">
            Çfarë shërbimesh ofrohen në Prishtinë?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Ndërtim shtëpish dhe vilash moderne</li>
            <li>Renovim i plotë i banesave</li>
            <li>Fasada dhe izolim termik</li>
            <li>Instalime elektrike dhe hidraulike</li>
            <li>Projekte afariste dhe objekte komerciale</li>
          </ul>

          {/* SECTION 3 */}
          <h2 className="text-2xl font-semibold">
            Si të gjeni kompaninë e duhur?
          </h2>

          <p>
            Gjetja e një kompanie ndërtimi në Prishtinë mund të jetë sfiduese për
            shkak të numrit të madh të ofertuesve në treg. Me Ndertimnet, ju
            thjesht publikoni projektin tuaj dhe kompanitë e interesuara ju
            kontaktojnë me oferta konkrete.
          </p>

          <p>
            Kjo ju lejon të krahasoni çmimet, përvojën dhe kushtet, duke ju dhënë
            kontroll të plotë në vendimmarrje.
          </p>

          {/* SECTION 4 */}
          <h2 className="text-2xl font-semibold">
            Zonat kryesore në Prishtinë
          </h2>

          <p>
            Kompanitë ndërtimore në Prishtinë operojnë në të gjitha lagjet,
            përfshirë:
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Ulpiana</li>
            <li>Dardania</li>
            <li>Arbëria (Dragodan)</li>
            <li>Bregu i Diellit</li>
            <li>Mati 1</li>
          </ul>

          {/* SECTION 5 */}
          <h2 className="text-2xl font-semibold">
            Pse të përdorni Ndertimnet?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Kompani të verifikuara dhe serioze</li>
            <li>Mundësi për të krahasuar oferta të ndryshme</li>
            <li>Kurseni kohë dhe shmangni rrezikun</li>
            <li>Proces i thjeshtë dhe i shpejtë</li>
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