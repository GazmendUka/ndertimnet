// ===========================================
// src/pages/UpdatesPage.jsx
// Ndertimnet – Updates / Roadmap Page (v1.1)
// ===========================================

import { Helmet } from "react-helmet";

export default function UpdatesPage() {

  // ================= DATA =================
  const inProgress = [
    {
      title: "Përmirësime sigurie për faqet publike",
      date: "Prill 2026",
      isNew: false,
    },
    {
      title: "përmirësime sigurie për faqet e kyçura",
      date: "Prill 2026",
      isNew: false,
    },
    {
      title: "Optimizimi i shpejtësisë së faqes së internetit",
      date: "Prill 2026",
      isNew: false,
    },
  ];

  const planned = [
    {
      title: "Profile të avancuara për kompani",
      date: "Maj 2026",
      isNew: false,
    },
    {
      title: "Sistem vlerësimi dhe review",
      date: "Maj 2026",
      isNew: false,
    },
    {
      title: "Përmirësimi i panelit të kompanisë",
      date: "Maj 2026",
      isNew: false,
    },
  ];

  const done = [
    {
      title: "Landing page e re me fokus në ty si përdoreus",
      date: "Mars 2026",
      isNew: true,
    },
    {
      title: "Faqet për qytete (Prishtinë, Tiranë, etj.)",
      date: "Mars 2026",
      isNew: true,
    },
    {
      title: "Përmirësime në login dhe autentikim",
      date: "Mars 2026",
      isNew: false,
    },
  ];

  // ================= COMPONENT =================
  const Item = ({ item, variant = "light" }) => (
    <div
      className={`p-4 rounded-xl border flex items-center justify-between ${
        variant === "light" ? "bg-gray-50" : "bg-white"
      }`}
    >
      <div>
        <p className="font-medium">{item.title}</p>
        <p className="text-sm text-gray-500 mt-1">
          Planifikuar: {item.date}
        </p>
      </div>

      {item.isNew && (
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black text-white">
          NEW
        </span>
      )}
    </div>
  );

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
            {inProgress.map((item, i) => (
              <Item key={i} item={item} />
            ))}
          </div>
        </section>

        {/* ================= PLANNED ================= */}
        <section className="max-w-4xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-semibold mb-6">
            🧭 Në plan
          </h2>

          <div className="space-y-4">
            {planned.map((item, i) => (
              <Item key={i} item={item} variant="white" />
            ))}
          </div>
        </section>

        {/* ================= DONE ================= */}
        <section className="max-w-4xl mx-auto px-6 py-10 pb-20">
          <h2 className="text-2xl font-semibold mb-6">
            ✅ Të publikuara
          </h2>

          <div className="space-y-4">
            {done.map((item, i) => (
              <Item key={i} item={item} />
            ))}
          </div>
        </section>

      </div>
    </>
  );
}