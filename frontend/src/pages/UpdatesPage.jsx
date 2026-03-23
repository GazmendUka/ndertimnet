// ===========================================
// src/pages/UpdatesPage.jsx
// Ndertimnet – Updates / Roadmap Page (v1)
// ===========================================

import { Helmet } from "react-helmet";

export default function UpdatesPage() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <html lang="sq" />

        <title>
          Përditësimet e platformës | Ndertimnet
        </title>

        <meta
          name="description"
          content="Shiko çfarë po ndërtojmë në Ndertimnet. Ndiq përditësimet, funksionalitetet e reja dhe planet tona për të ardhmen."
        />

        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="bg-white text-gray-900">

        {/* ================= HERO ================= */}
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Çfarë po ndërtojmë
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            Në Ndertimnet ne punojmë vazhdimisht për të përmirësuar platformën.
            Këtu mund të shihni funksionalitetet që janë në zhvillim, ato që
            planifikojmë dhe ato që kemi publikuar së fundmi.
          </p>
        </section>

        {/* ================= IN PROGRESS ================= */}
        <section className="max-w-4xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-semibold mb-6">
            🚧 Në zhvillim
          </h2>

          <div className="space-y-4">
            {[
              "Chat midis klientit dhe kompanisë",
              "Përmirësime në sistemin e ofertave",
              "Optimizim i dashboard për kompani",
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border bg-gray-50"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* ================= PLANNED ================= */}
        <section className="max-w-4xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-semibold mb-6">
            🧭 Në plan
          </h2>

          <div className="space-y-4">
            {[
              "Profile të avancuara për kompani",
              "Sistem vlerësimi dhe review",
              "Njoftime në kohë reale",
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border bg-white"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* ================= DONE ================= */}
        <section className="max-w-4xl mx-auto px-6 py-10 pb-20">
          <h2 className="text-2xl font-semibold mb-6">
            ✅ Të publikuara
          </h2>

          <div className="space-y-4">
            {[
              "Landing page e re me fokus SEO",
              "Faqet për qytete (Prishtinë, Tiranë, etj.)",
              "Përmirësime në login dhe autentikim",
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border bg-gray-50"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}