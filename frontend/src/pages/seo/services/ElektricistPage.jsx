// src/pages/seo/services/ElektricistPage.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Zap } from "lucide-react";

import PublicLayout from "../../../components/layout/PublicLayout";

export default function ElektricistPage() {
  return (
    <PublicLayout>
      <Helmet>
        <html lang="sq" />
        <title>Elektricist në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej elektricist për instalime dhe riparime elektrike."
        />

        <link rel="canonical" href="https://ndertimnet.com/elektricist" />
      </Helmet>

      <main className="bg-white text-slate-900">

        <section className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold">Elektricist</h1>

          <p className="mt-6 text-lg text-slate-600">
            Instalimet elektrike janë thelbësore për sigurinë dhe funksionimin
            e çdo objekti.
          </p>

          <div className="mt-6 flex gap-4">
            <Link to="/register/customer" className="btn-primary">
              Publiko projektin
            </Link>
          </div>
        </section>

      </main>
    </PublicLayout>
  );
}