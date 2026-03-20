// ===========================================
// src/pages/ContactPage.jsx
// Ndertimnet – Contact Page (Enterprise UX + SEO)
// ===========================================

import { Helmet } from "react-helmet";
import { useState } from "react";
import {
  Mail,
  MapPin,
  Send,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import PublicLayout from "../components/layout/PublicLayout"; 

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // ================= VALIDATION =================
  const validate = () => {
    let newErrors = {};

    if (!form.name.trim()) newErrors.name = "Emri është i detyrueshëm";
    if (!form.email.includes("@")) newErrors.email = "Email i pavlefshëm";
    if (form.message.length < 10)
      newErrors.message = "Mesazhi duhet të ketë të paktën 10 karaktere";

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Fake success (backend senare)
    setErrors({});
    setSuccess(true);
  };

  return (
    <>
      {/* ================= SEO (ENTERPRISE) ================= */}
      <Helmet>
        <html lang="sq" />
        <title>Kontakto Ndertimnet | Platformë për Ndërtim & Renovim</title>

        <meta
          name="description"
          content="Kontaktoni Ndertimnet për bashkëpunim, mbështetje ose pyetje. Platforma kryesore për ndërtim dhe renovim në Kosovë dhe Shqipëri."
        />

        <meta name="robots" content="index, follow" />

        {/* Open Graph */}
        <meta property="og:title" content="Kontakto Ndertimnet" />
        <meta
          property="og:description"
          content="Na kontaktoni për bashkëpunim ose mbështetje në projektet tuaja të ndërtimit."
        />
        <meta property="og:type" content="website" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Ndertimnet",
            url: "https://ndertimnet.com",
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              email: "info@ndertimnet.com",
              availableLanguage: ["Albanian", "English"],
            },
          })}
        </script>
      </Helmet>

      {/* ================= HERO ================= */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold mb-6">
            Na kontaktoni
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Keni pyetje apo dëshironi bashkëpunim? Na dërgoni një mesazh dhe ne
            do t’ju përgjigjemi sa më shpejt.
          </p>
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          
          {/* LEFT */}
          <div className="space-y-8">

            <div>
              <h2 className="text-xl font-semibold mb-4">
                Informacion kontakti
              </h2>
            </div>

            <div className="space-y-6">

              <div className="flex items-start gap-4">
                <Mail className="text-black" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-gray-600">info@ndertimnet.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <MapPin className="text-black" />
                <div>
                  <p className="font-medium">Lokacioni</p>
                  <p className="text-gray-600">Prishtinë / Tiranë</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="text-black" />
                <div>
                  <p className="font-medium">Orari</p>
                  <p className="text-gray-600">
                    Hënë – Premte: 09:00 – 17:00
                  </p>
                </div>
              </div>

            </div>

            {/* TRUST */}
            <div className="bg-gray-50 p-6 rounded-2xl">
              <div className="flex items-start gap-4">
                <ShieldCheck className="text-black" />
                <div>
                  <p className="font-semibold">Platformë e verifikuar</p>
                  <p className="text-gray-600 text-sm">
                    Ne punojmë vetëm me kompani të verifikuara për cilësi dhe
                    besueshmëri maksimale.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT */}
          <div className="bg-white border rounded-2xl p-8">

            <h2 className="text-xl font-semibold mb-6">
              Dërgo një mesazh
            </h2>

            {success ? (
              <div className="text-center py-10">
                <CheckCircle2 className="mx-auto mb-4 text-green-600" size={40} />
                <p className="text-lg font-medium">
                  Mesazhi u dërgua me sukses
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Ne do t’ju kontaktojmë së shpejti.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">

                <div>
                  <input
                    type="text"
                    placeholder="Emri juaj"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <textarea
                    rows="5"
                    placeholder="Mesazhi juaj"
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.message && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium hover:opacity-90"
                >
                  Dërgo mesazhin <Send size={18} />
                </button>

              </form>
            )}

          </div>

        </div>
      </section>

      {/* ================= DIGITAL NOTE ================= */}
      <section className="py-12 text-center">
        <div className="max-w-3xl mx-auto px-6 text-gray-600 text-sm">
          Ne po ndërtojmë një platformë plotësisht digjitale ku të gjitha
          proceset – nga publikimi i projektit deri te komunikimi me kompanitë –
          do të menaxhohen direkt në platformë. Aktualisht nuk ofrojmë mbështetje
          telefonike.
        </div>
      </section>
    </>
  );
}