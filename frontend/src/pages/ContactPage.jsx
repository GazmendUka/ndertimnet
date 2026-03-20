// ===========================================
// src/pages/ContactPage.jsx
// Ndertimnet – Contact Page (Premium + SEO)
// ===========================================

import { Helmet } from "react-helmet";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Building2,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function ContactPage() {
  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <html lang="sq" />
        <title>Kontakto Ndertimnet | Ndërtim & Renovim</title>
        <meta
          name="description"
          content="Kontaktoni Ndertimnet për bashkëpunim, pyetje ose mbështetje. Ne ju lidhim me kompani ndërtimi të verifikuara në Kosovë dhe Shqipëri."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Kontakto Ndertimnet" />
        <meta
          property="og:description"
          content="Na kontaktoni për bashkëpunim ose pyetje rreth platformës sonë për ndërtim dhe renovim."
        />
      </Helmet>

      {/* ================= HERO ================= */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Na kontaktoni
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Keni pyetje, dëshironi bashkëpunim apo keni nevojë për ndihmë?
            Ekipi ynë është këtu për t’ju ndihmuar.
          </p>
        </div>
      </section>

      {/* ================= CONTACT SECTION ================= */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          
          {/* LEFT: INFO */}
          <div className="space-y-8">
            
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Informacion kontakti
              </h2>
              <p className="text-gray-600">
                Mund të na kontaktoni direkt ose të përdorni formularin.
              </p>
            </div>

            <div className="space-y-6">
              
              <div className="flex items-start gap-4">
                <Mail className="text-blue-600" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-gray-600">info@ndertimnet.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="text-blue-600" />
                <div>
                  <p className="font-medium">Telefoni</p>
                  <p className="text-gray-600">+383 XX XXX XXX</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <MapPin className="text-blue-600" />
                <div>
                  <p className="font-medium">Lokacioni</p>
                  <p className="text-gray-600">Prishtinë / Tiranë</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="text-blue-600" />
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
                <ShieldCheck className="text-green-600" />
                <div>
                  <p className="font-semibold">Platformë e verifikuar</p>
                  <p className="text-gray-600 text-sm">
                    Ne punojmë vetëm me kompani të verifikuara për të siguruar
                    cilësi dhe besim maksimal.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT: FORM */}
          <div className="bg-white shadow-lg rounded-2xl p-8">
            
            <h2 className="text-2xl font-semibold mb-6">
              Dërgo një mesazh
            </h2>

            <form className="space-y-5">
              
              <input
                type="text"
                placeholder="Emri juaj"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="email"
                placeholder="Email"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                rows="5"
                placeholder="Mesazhi juaj"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 font-medium"
              >
                Dërgo mesazhin <Send size={18} />
              </button>

            </form>

          </div>

        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-blue-600 text-white py-16 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">
            Publiko projektin tënd sot
          </h2>
          <p className="mb-6 text-blue-100">
            Merr oferta nga kompani të verifikuara brenda pak orësh.
          </p>
          <a
            href="/create-project"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
          >
            Fillo tani
          </a>
        </div>
      </section>
    </>
  );
}