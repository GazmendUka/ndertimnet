// src/pages/seo/services/RenovimKuzhinePage.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ChefHat,
  CheckCircle2,
  Hammer,
  Sparkles,
  ArrowRight,
  Wrench,
  Building2,
  ClipboardList,
  HelpCircle,
} from "lucide-react";

import PublicLayout from "../../layout/PublicLayout";

export default function RenovimKuzhinePage() {
  return (
    <PublicLayout>
      <Helmet>
        <html lang="sq" />

        <title>Renovim kuzhine në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej kompani për renovim kuzhine. Modernizo kuzhinën me profesionistë për mobilim, instalime dhe dizajn funksional."
        />

        <link rel="canonical" href="https://ndertimnet.com/renovim-kuzhine" />
      </Helmet>

      <main className="bg-white text-slate-900">

        {/* HERO */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold">
            Renovim kuzhine moderne dhe funksionale
          </h1>

          <p className="mt-6 text-lg text-slate-600">
            Kuzhina është zemra e shtëpisë. Një renovim i mirë përmirëson
            funksionalitetin, estetikën dhe vlerën e pronës.
          </p>

          <div className="mt-8 flex gap-4">
            <Link to="/register/customer" className="btn-primary">
              Publiko projektin
            </Link>
            <Link to="/companies" className="btn-secondary">
              Gjej kompani
            </Link>
          </div>
        </section>

        {/* CONTENT */}
        <section className="max-w-5xl mx-auto px-6 py-10">
          <p className="text-lg leading-8">
            Renovimi i kuzhinës përfshin mobilim, instalime dhe optimizim të
            hapësirës. Një kuzhinë e mirë e dizajnuar rrit komoditetin dhe
            efikasitetin në përdorim të përditshëm.
          </p>
        </section>

        {/* INCLUDES */}
        <section className="max-w-5xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-semibold">
            Çfarë përfshin renovimi i kuzhinës
          </h2>

          <ul className="mt-4 space-y-2">
            <li>Mobilim dhe dollapë</li>
            <li>Instalime hidraulike dhe elektrike</li>
            <li>Pllaka dhe sipërfaqe pune</li>
          </ul>
        </section>

        {/* INTERNAL LINKS */}
        <section className="max-w-5xl mx-auto px-6 py-10">
          <h3 className="font-semibold mb-3">Shërbime të tjera</h3>

          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/ndertime">Ndërtim</Link>
            <Link to="/renovime">Renovime</Link>
            <Link to="/renovim-banjo">Banjo</Link>
            <Link to="/elektricist">Elektricist</Link>
            <Link to="/lyerje">Lyerje</Link>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-slate-900 text-white px-6 py-16">
          <h2 className="text-3xl font-bold">
            Gati për të renovuar kuzhinën?
          </h2>

          <div className="mt-6 flex gap-4">
            <Link to="/register/customer" className="btn-white">
              Publiko projektin
            </Link>
          </div>
        </section>

      </main>
    </PublicLayout>
  );
}