// src/components/marketing/MarketingCampaignPreview.jsx

import { ExternalLink, Sparkles } from "lucide-react";

export default function MarketingCampaignPreview({
  title,
  description,
  imagePreview,
  companyName = "Partner",
  ctaText = "Upptäck mer",
}) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600">
        <Sparkles size={16} />
        Live preview
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white">
        <div className="relative min-h-[420px]">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt={title || "Campaign preview"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-white" />
          )}

          <div className="absolute inset-0 bg-black/30" />

          <div className="relative z-10 flex min-h-[420px] flex-col justify-end p-6 md:p-8">
            <div className="mb-4 inline-flex w-fit items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-800 backdrop-blur">
              Veckans inspiration
            </div>

            <div className="max-w-xl">
              <h3 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {title || "Moderna kök för ditt hem"}
              </h3>

              <p className="mt-3 max-w-lg text-sm leading-6 text-white/90 md:text-base">
                {description ||
                  "Visa upp din produkt eller tjänst som inspiration för användare med verklig renoverings- eller byggintention."}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  Partner: {companyName}
                </span>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  {ctaText}
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Förhandsvisningen visar hur kampanjen ungefär kommer att upplevas i en
        premium “Inspiration / Partner”-yta. Slutlig publicering sker först efter granskning.
      </p>
    </div>
  );
}