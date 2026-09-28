// ===========================================
// src/pages/ContactPage.jsx
// Ndertimnet – Contact Page (Enterprise UX + SEO)
// ===========================================

import { Helmet } from "react-helmet";
import { useRef, useState } from "react";
import api from "../api/axios";
import {
  Mail,
  MapPin,
  Send,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const submitting = useRef(false);

  // ================= VALIDATION =================
  const validate = () => {
    let newErrors = {};

    if (!form.name.trim()) newErrors.name = "Emri është i detyrueshëm";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) newErrors.email = "Email i pavlefshëm";
    if (form.message.trim().length < 10)
      newErrors.message = "Mesazhi duhet të ketë të paktën 10 karaktere";

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    setSendError("");

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    submitting.current = true;
    setSending(true);
    try {
      const response = await api.post("contact/", {
        name: form.name.trim(), email: form.email.trim(), message: form.message.trim(),
      }, { skipAuth: true, skipErrorLog: true, timeout: 20000 });
      if (response.data?.accepted !== true) throw new Error("Unconfirmed delivery");
      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      const status = error.response?.status;
      if (status === 400) {
        const data = error.response?.data || {};
        setErrors({
          ...(data.name && { name: "Kontrolloni emrin (deri në 120 karaktere)." }),
          ...(data.email && { email: "Kontrolloni adresën e emailit." }),
          ...(data.message && { message: "Mesazhi duhet të ketë 10–5000 karaktere." }),
        });
      }
      setSendError(status === 429
        ? "Keni dërguar shumë kërkesa. Ju lutem provoni përsëri më vonë."
        : status === 400 ? "Kontrolloni të dhënat dhe provoni përsëri."
        : "Dërgimi nuk mund të konfirmohej. Teksti juaj është ruajtur në formular. Ju lutem provoni përsëri më vonë.");
    } finally {
      submitting.current = false;
      setSending(false);
    }
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
                  <p className="font-medium">Na shkruani</p>
                  <p className="text-gray-600">Përdorni formularin e kontaktit. Përgjigjen do ta merrni në emailin që shënoni.</p>
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
              <div className="text-center py-10" role="status">
                <CheckCircle2 className="mx-auto mb-4 text-green-600" size={40} />
                <p className="text-lg font-medium">
                  Mesazhi u dërgua me sukses
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Ne do t’ju kontaktojmë së shpejti.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-busy={sending}>
                {sendError && (
                  <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {sendError}
                  </div>
                )}

                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium mb-1">Emri juaj</label>
                  <input
                    id="contact-name"
                    autoComplete="name"
                    maxLength={120}
                    disabled={sending}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "contact-name-error" : undefined}
                    type="text"
                    placeholder="Emri juaj"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.name && (
                    <p id="contact-name-error" role="alert" className="text-sm text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium mb-1">Email</label>
                  <input
                    id="contact-email"
                    autoComplete="email"
                    maxLength={254}
                    disabled={sending}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "contact-email-error" : undefined}
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.email && (
                    <p id="contact-email-error" role="alert" className="text-sm text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium mb-1">Mesazhi juaj</label>
                  <textarea
                    id="contact-message"
                    maxLength={5000}
                    disabled={sending}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? "contact-message-error" : undefined}
                    rows="5"
                    placeholder="Mesazhi juaj"
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  {errors.message && (
                    <p id="contact-message-error" role="alert" className="text-sm text-red-500 mt-1">
                      {errors.message}
                    </p>
                  )}
                </div>

                <p className="text-xs text-gray-600">Mos dërgoni fjalëkalime, kode verifikimi ose të dhëna karte. <a className="underline" href="/privacy.html">Politika e privatësisë</a></p>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-black text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? "Duke dërguar…" : "Dërgo mesazhin"} <Send size={18} />
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
