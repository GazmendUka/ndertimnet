// src/pages/marketing/CreateMarketingCampaignPage.jsx

import React, { useMemo, useState, useEffect, useRef } from "react";
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
import api from "../../api/axios";
import MarketingCampaignPreview from "../../components/marketing/MarketingCampaignPreview";

const INITIAL_FORM = {
  title: "",
  description: "",
  destination_url: "",
  cta_text: "Zbulo më shumë",
  duration_days: "3",
  image: null,
};

const DURATION_OPTIONS = [
  { value: "3", label: "3 ditë", note: "Periudhë e shkurtër" },
  { value: "7", label: "7 ditë", note: "Një javë" },
  { value: "14", label: "14 ditë", note: "Dukshmëri më e gjatë" },
];

export default function CreateMarketingCampaignPage() {
  const { user } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitLock = useRef(false);
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
    "Biznesi juaj";

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Titulli është i detyrueshëm.";
    } else if (form.title.trim().length < 5) {
      nextErrors.title = "Titulli duhet të ketë të paktën 5 karaktere.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Përshkrimi është i detyrueshëm.";
    } else if (form.description.trim().length < 20) {
      nextErrors.description = "Përshkrimi duhet të ketë të paktën 20 karaktere.";
    }

    if (!form.destination_url.trim()) {
      nextErrors.destination_url = "Lidhja është e detyrueshme.";
    } else {
      try {
        const url = new URL(form.destination_url.trim());
        if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid protocol");
      } catch {
        nextErrors.destination_url = "Shkruani një adresë URL të vlefshme, p.sh. https://example.com";
      }
    }

    if (!form.image) {
      nextErrors.image = "Imazhi është i detyrueshëm.";
    } else if (form.image.size > 5 * 1024 * 1024) {
      nextErrors.image = "Imazhi duhet të jetë jo më i madh se 5 MB.";
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
    if (submitLock.current) return;

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    submitLock.current = true;
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      ["title", "description", "destination_url", "cta_text", "duration_days"].forEach((key) => payload.append(key, form[key]));
      payload.append("image", form.image);
      await api.post("marketing/campaigns/", payload);
      setSubmitted(true);
    } catch (error) {
      const fields = error.response?.data;
      const mapped = {};
      ["title", "description", "destination_url", "cta_text", "duration_days", "image"].forEach((key) => {
        if (fields?.[key]) mapped[key] = Array.isArray(fields[key]) ? fields[key].join(" ") : String(fields[key]);
      });
      setErrors({ ...mapped, submit: Object.keys(mapped).length ? "Kontrolloni fushat e shënuara." : "Fushata nuk u dërgua. Kontrolloni lidhjen dhe provoni përsëri." });
    } finally {
      submitLock.current = false;
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
            Fushata është dërguar
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-gray-600">
            Fushata juaj është dërguar për shqyrtim. Pas miratimit, ajo mund të
            publikohet në hapësirën tonë të frymëzimit dhe partnerëve.
          </p>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-medium text-gray-900">Hapat e ardhshëm</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
              <li>• Shqyrtojmë imazhin, tekstin dhe lidhjen.</li>
              <li>• Pas miratimit, statusi bëhet “E miratuar” ose “Aktive”.</li>
              <li>• Nëse nevojitet, do të merrni komente për ndryshime.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/company/marketing"
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
            >
              Te marketingu
            </Link>

            <Link
              onClick={() => { setSubmitted(false); setForm(INITIAL_FORM); setImagePreview(""); setErrors({}); }}
              to="/company/marketing/create"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Krijo një fushatë të re
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
          Kthehu te marketingu
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
            <Rocket size={14} />
            Rekomandime të zgjuara nga partnerët
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            Krijo fushatë
          </h1>

          <p className="mt-3 text-base leading-7 text-gray-600">
            Krijoni një fushatë që paraqitet si frymëzim në një hapësirë të veçantë.
            Fushata shqyrtohet gjithmonë para publikimit për të siguruar cilësi të lartë
            dhe një përvojë të mirë për përdoruesit.
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-[28px] border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 text-blue-600" size={18} />
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Publikim vetëm pas miratimit
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              Bizneset mund ta krijojnë vetë fushatën, por ajo publikohet vetëm pasi
              përmbajtja të jetë shqyrtuar dhe miratuar.
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
              <h2 className="text-lg font-semibold text-gray-900">Përmbajtja e fushatës</h2>
              <p className="mt-1 text-sm text-gray-500">
                Përmbajtja duhet të frymëzojë, jo të duket si reklamë tradicionale.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <label htmlFor="campaign-title" className="mb-2 block text-sm font-medium text-gray-800">
                    Titulli
                  </label>
                  <input
                    type="text"
                    id="campaign-title"
                    name="title"
                    maxLength={180}
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Kuzhina moderne për shtëpinë tuaj"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  />
                  {errors.title ? (
                    <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="campaign-description" className="mb-2 block text-sm font-medium text-gray-800">
                    Përshkrim i shkurtër
                  </label>
                  <textarea
                    id="campaign-description"
                    name="description"
                    maxLength={260}
                    rows={4}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Përshkruani shkurt çfarë do të zbulojë përdoruesi kur të klikojë."
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  />
                  {errors.description ? (
                    <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="campaign-destination_url" className="mb-2 block text-sm font-medium text-gray-800">
                    Lidhja
                  </label>
                  <input
                    type="url"
                    id="campaign-destination_url"
                    name="destination_url"
                    maxLength={200}
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
                  <label htmlFor="campaign-cta_text" className="mb-2 block text-sm font-medium text-gray-800">
                    Teksti i butonit
                  </label>
                  <input
                    type="text"
                    id="campaign-cta_text"
                    name="cta_text"
                    maxLength={40}
                    value={form.cta_text}
                    onChange={handleChange}
                    placeholder="Zbulo më shumë"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-900"
                  />
                  {errors.cta_text && <p className="mt-2 text-sm text-red-600">{errors.cta_text}</p>}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">Imazhi dhe publikimi</h2>
              <p className="mt-1 text-sm text-gray-500">
                Përdorni imazh horizontal, të paktën 1200 × 600 px. Rekomandohet 1920 × 900 px. Maksimumi 5 MB dhe 20 megapikselë.
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Imazhi i fushatës
                  </label>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition hover:border-gray-400 hover:bg-gray-100">
                    <ImagePlus size={24} className="text-gray-500" />
                    <span className="mt-3 text-sm font-medium text-gray-800">
                      Ngarko imazh
                    </span>
                    <span className="mt-1 text-xs text-gray-500">
                      PNG, JPG ose WEBP
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
                    Periudha
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
                    Vendosja
                  </label>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">
                      Hero / Ballina
                    </div>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Fushata shfaqet në një hapësirë të veçantë si përmbajtje frymëzuese nga partnerët.
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
                    Shqyrtim para publikimit
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Kur dërgoni fushatën, ajo merr statusin{" "}
                    <span className="font-medium text-gray-900">Në pritje të miratimit</span>.
                    Pas shqyrtimit, ajo mund të miratohet, të aktivizohet ose të kthehet
                    për ndryshime.
                  </p>
                </div>
              </div>
            </section>

            {errors.submit && <p role="alert" className="text-sm text-red-700">{errors.submit}</p>}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {isSubmitting ? "Duke dërguar fushatën..." : "Dërgo për miratim"}
              </button>

              <p className="text-sm text-gray-500">
                Periudha e zgjedhur: <span className="font-medium text-gray-800">{selectedDuration?.label}</span>
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
            ctaText={form.cta_text || "Zbulo më shumë"}
          />
        </div>
      </div>
    </div>
  );
}