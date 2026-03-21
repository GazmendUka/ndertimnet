// src/pages/seo/NdertimVlore.jsx

import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

export default function NdertimVlore() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <meta name="robots" content="index, follow" />

        <title>
          Kompani ndërtimi në Vlorë | Ndërtim dhe vila luksoze
        </title>

        <meta
          name="description"
          content="Gjej kompani ndërtimi në Vlorë për vila luksoze, apartamente dhe projekte turistike. Publiko projektin dhe merr oferta nga profesionistë të verifikuar."
        />

        <link
          rel="canonical"
          href="https://ndertimnet.com/ndertim/vlore"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Ndërtim në Vlorë | Ndertimnet" />
        <meta
          property="og:description"
          content="Ndërto ose renovo në Vlorë me kompani profesionale dhe të verifikuara."
        />
        <meta
          property="og:url"
          content="https://ndertimnet.com/ndertim/vlore"
        />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* HERO */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Kompani ndërtimi në Vlorë
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Po kërkoni kompani ndërtimi në Vlorë për ndërtim apo renovim?
          Ndertimnet ju ndihmon të gjeni profesionistë për projekte banimi
          dhe turistike në një nga zonat më të kërkuara në Shqipëri.
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
            Ndërtim dhe renovim në Vlorë
          </h2>

          <p>
            Vlora është një nga destinacionet më të rëndësishme turistike në
            Shqipëri, me një rritje të shpejtë të investimeve në ndërtim. Nga
            apartamente moderne me pamje nga deti deri tek vila luksoze,
            kërkesa për kompani ndërtimi profesionale është në rritje të vazhdueshme.
          </p>

          <p>
            Ndërtimi në këtë zonë kërkon standarde të larta cilësie dhe përdorim
            të materialeve të përshtatshme për klimën bregdetare.
          </p>

          {/* SECTION 2 */}
          <h2 className="text-2xl font-semibold">
            Çfarë projektesh realizohen në Vlorë?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Ndërtim vilash luksoze pranë detit</li>
            <li>Apartamente pushimi dhe investime turistike</li>
            <li>Renovim i banesave ekzistuese</li>
            <li>Ndërtim hotelesh dhe resorteve</li>
            <li>Punime të brendshme dhe dizajn modern</li>
          </ul>

          {/* SECTION 3 */}
          <h2 className="text-2xl font-semibold">
            Si funksionon Ndertimnet?
          </h2>

          <p>
            Me Ndertimnet, ju mund të publikoni projektin tuaj dhe të merrni
            oferta nga kompani ndërtimi në Vlorë që janë të interesuara për
            projektin tuaj.
          </p>

          <p>
            Krahasoni ofertat, analizoni kushtet dhe zgjidhni partnerin më të
            përshtatshëm për investimin tuaj.
          </p>

          {/* SECTION 4 */}
          <h2 className="text-2xl font-semibold">
            Zonat kryesore në Vlorë
          </h2>

          <p>
            Kompanitë ndërtimore operojnë në zonat më të kërkuara si:
          </p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Lungomare</li>
            <li>Uji i Ftohtë</li>
            <li>Radhimë</li>
            <li>Orikum</li>
            <li>Dhërmi dhe zonat përreth</li>
          </ul>

          {/* SECTION 5 */}
          <h2 className="text-2xl font-semibold">
            Pse të zgjidhni Ndertimnet?
          </h2>

          <ul className="list-disc pl-6 space-y-2">
            <li>Kompani të verifikuara dhe me eksperiencë</li>
            <li>Krahasim i ofertave për projekte të mëdha dhe të vogla</li>
            <li>Kurseni kohë dhe optimizoni investimin tuaj</li>
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
            Filloni tani – Publikoni projektin tuaj
          </Link>
        </div>

      </div>
    </>
  );
}