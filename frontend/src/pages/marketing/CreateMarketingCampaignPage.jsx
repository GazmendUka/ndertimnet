// src/pages/marketing/CreateMarketingCampaignPage.jsx

import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ImagePlus,
  Info,
  Send,
  Rocket,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import MarketingCampaignPreview from "../../components/marketing/MarketingCampaignPreview";

const INITIAL_FORM = {
  title: "",
  description: "",
  destination_url: "",
  cta_text: "Upptäck mer",
  duration_days: "3",
  placement: "hero_inspiration",
  image: null,
};

const DURATION_OPTIONS = [
  { value: "3", label: "3 dagar", note: "Gratis första kampanjen" },
  { value: "7", label: "7 dagar", note: "Fast pris / vecka" },
  { value: "14", label: "14 dagar", note: "Längre synlighet" },
];

export default function CreateMarketingCampaignPage() {
  const { user } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const companyName =
    user?.company?.company_name ||
    user?.company?.name ||
    user?.company_name ||
    "Ditt företag";

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Titel krävs.";
    } else if (form.title.trim().length < 5) {
      nextErrors.title = "Titeln måste vara minst 5 tecken.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Beskrivning krävs.";
    } else if (form.description.trim().length < 20) {
      nextErrors.description = "Beskrivningen måste vara minst 20 tecken.";
    }

    if (!form.destination_url.trim()) {
      nextErrors.destination_url = "Länk krävs.";
    } else {
      try {
        new URL(form.destination_url.trim());
      } catch {
        nextErrors.destination_url = "Ange en giltig URL, t.ex. https://example.com";
      }
    }

    if (!form.image) {
      nextErrors.image = "Bild krävs.";
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

  // 🔥 rensa tidigare preview
  if (imagePreview) {
    URL.revokeObjectURL(imagePreview);
  }

  setForm((prev) => ({
    ...prev,
    image: file,
  }));

  setErrors((prev) => ({ ...prev, image: "" }));

  if (!file) {
    setImagePreview("");
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  setImagePreview(previewUrl);
};

  const selectedDuration = useMemo(
    () => DURATION_OPTIONS.find((item) => item.value === form.duration_days),
    [form.duration_days]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      // TODO: Koppla backend senare med FormData + API POST.
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit campaign", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="premium-container py-8 md:py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-gray-200 bg-white p-8 shadow-sm md:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <BadgeCheck size={28} />
          </div>

          <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-gray-900">
            Kampanjen har skickats
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-gray-600">
            Din kampanj är nu skickad för granskning. När den blir godkänd kan den
            publiceras i vår premium-yta för inspiration och partners.
          </p>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-medium text-gray-900">Nästa steg</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
              <li>• Vi granskar bild, text och länk.</li>
              <li>• Vid godkännande blir status “Approved” eller “Active”.</li>
              <li>• Vid behov kan ni få feedback för justeringar.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/company/marketing"
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
            >
              Till Marketing
            </Link>

            <Link
              to="/company/marketing/create"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Skapa en ny kampanj
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-container py-8 md:py-10">
      <div className="mb-8">
        <Link
          to="/company/marketing"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Tillbaka till Marketing
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
            <Rocket size={14} />
            Smart recommendations powered by partners
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            Skapa kampanj
          </h1>

          <p className="mt-3 text-base leading-7 text-gray-600">
            Skapa en kampanj som presenteras som inspiration i en premium-yta.
            Kampanjen granskas alltid innan publicering för att säkerställa hög kvalitet
            och en bra upplevelse för användaren.
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-[28px] border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 text-blue-600" size={18} />
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Din första kampanj är gratis i 3 dagar
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              Företag kan skapa kampanjen själva, men publicering sker först efter att
              innehållet har granskats och godkänts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">Kampanjinnehåll</h2>
              <p className="mt-1 text-sm text-gray-500">
                Det ska kännas som inspiration, inte traditionell reklam.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Titel
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Moderna kök för ditt hem"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  />
                  {errors.title ? (
                    <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Kort beskrivning
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Beskriv kort vad användaren upptäcker när de klickar vidare."
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  />
                  {errors.description ? (
                    <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Länk
                  </label>
                  <input
                    type="url"
                    name="destination_url"
                    value={form.destination_url}
                    onChange={handleChange}
                    placeholder="https://example.com/landing-page"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  />
                  {errors.destination_url ? (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.destination_url}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    CTA-text
                  </label>
                  <input
                    type="text"
                    name="cta_text"
                    value={form.cta_text}
                    onChange={handleChange}
                    placeholder="Upptäck mer"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">Bild & publicering</h2>
              <p className="mt-1 text-sm text-gray-500">
                Använd en ren, högkvalitativ bild som passar hero-format.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Kampanjbild
                  </label>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition hover:border-gray-400 hover:bg-gray-100">
                    <ImagePlus size={24} className="text-gray-500" />
                    <span className="mt-3 text-sm font-medium text-gray-800">
                      Ladda upp bild
                    </span>
                    <span className="mt-1 text-xs text-gray-500">
                      PNG, JPG eller WEBP
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>

                  {errors.image ? (
                    <p className="mt-2 text-sm text-red-600">{errors.image}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Period
                  </label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {DURATION_OPTIONS.map((option) => {
                      const isSelected = form.duration_days === option.value;

                      return (
                        <label
                          key={option.value}
                          className={`cursor-pointer rounded-2xl border p-4 transition ${
                            isSelected
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name="duration_days"
                            value={option.value}
                            checked={isSelected}
                            onChange={handleChange}
                            className="hidden"
                          />
                          <div className="text-sm font-semibold">{option.label}</div>
                          <div
                            className={`mt-1 text-xs ${
                              isSelected ? "text-gray-300" : "text-gray-500"
                            }`}
                          >
                            {option.note}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Placement
                  </label>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">
                      Inspiration / Hero
                    </div>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Kampanjen visas i en premium-yta som inspirerande partnerinnehåll.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 text-gray-500" size={18} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Granskning innan publicering
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    När du skickar kampanjen sätts den i status{" "}
                    <span className="font-medium text-gray-900">Pending approval</span>.
                    Efter granskning kan den godkännas, aktiveras eller skickas tillbaka
                    för justeringar.
                  </p>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {isSubmitting ? "Skickar kampanj..." : "Skicka för godkännande"}
              </button>

              <p className="text-sm text-gray-500">
                Vald period: <span className="font-medium text-gray-800">{selectedDuration?.label}</span>
              </p>
            </div>
          </div>
        </form>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <MarketingCampaignPreview
            title={form.title}
            description={form.description}
            imagePreview={imagePreview}
            companyName={companyName}
            ctaText={form.cta_text || "Upptäck mer"}
          />
        </div>
      </div>
    </div>
  );
}