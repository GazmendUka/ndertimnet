// src/components/marketing/MarketingCampaignPreview.jsx

import { ExternalLink, Megaphone } from "lucide-react";

export default function MarketingCampaignPreview({
  title,
  description,
  imagePreview,
  companyName = "Partner",
  ctaText = "Upptäck mer",
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600">
        <Megaphone size={16} />
        Live preview
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#ddd6c9] bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative aspect-[16/9] min-h-[210px] lg:aspect-auto lg:min-h-[320px]">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt={title || "Campaign preview"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-white" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#12251b] shadow-sm backdrop-blur">Reklamë</span>
        </div>

        <div className="flex flex-col justify-center p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6b60]">Përmbajtje e sponsorizuar</p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#12251b]">
            {title || "Moderna kök för ditt hem"}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#5f6f66]">
            {description || "Visa upp din produkt eller tjänst för användare med verklig renoverings- eller byggintention."}
          </p>
          <span className="mt-4 text-xs font-medium text-[#7a6b60]">Partner: {companyName}</span>
          <button type="button" className="mt-5 inline-flex min-h-[44px] self-start items-center gap-2 rounded-lg bg-[#ef7d22] px-5 py-2.5 text-sm font-semibold text-white">
            {ctaText}<ExternalLink size={16} />
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Förhandsvisningen visar hur kampanjen ungefär kommer att upplevas i en
        en tydligt annonsmärkt yta under startsidans huvudbudskap. Slutlig publicering sker först efter granskning.
      </p>
    </div>
  );
}
