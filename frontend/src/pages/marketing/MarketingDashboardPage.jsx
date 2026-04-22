// src/pages/marketing/MarketingDashboardPage.jsx

import React from "react";
import { Link } from "react-router-dom";
import {
  Megaphone,
  Plus,
  Eye,
  MousePointerClick,
  LayoutTemplate,
} from "lucide-react";
import MarketingCampaignCard from "../../components/marketing/MarketingCampaignCard";

const mockCampaigns = [
  {
    id: 1,
    title: "Moderna kök för ditt hem",
    description:
      "Inspirera användare som planerar renovering med en premium kökslösning.",
    image:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    status: "active",
    placement_label: "Hero / Inspiration",
    start_date: "2026-04-18",
    end_date: "2026-04-25",
    impressions: 1245,
    clicks: 37,
  },
  {
    id: 2,
    title: "Smart förvaring för hela hemmet",
    description:
      "Lyft fram praktiska lösningar som passar både renovering och nyinredning.",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    status: "pending",
    placement_label: "Hero / Inspiration",
    start_date: "2026-04-26",
    end_date: "2026-05-03",
    impressions: 0,
    clicks: 0,
  },
  {
    id: 3,
    title: "Verktyg för proffs",
    description:
      "Nå företag som behöver kvalitet, hållbarhet och leveranssäkerhet.",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
    status: "rejected",
    placement_label: "Hero / Inspiration",
    start_date: "2026-04-10",
    end_date: "2026-04-17",
    impressions: 0,
    clicks: 0,
    rejection_reason:
      "Bilden uppfyller inte kvalitetskraven för hero-placement. Ladda gärna upp en bredare och mer premium-anpassad bild.",
  },
];

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MarketingDashboardPage() {
  const activeCount = mockCampaigns.filter((item) => item.status === "active").length;
  const pendingCount = mockCampaigns.filter((item) => item.status === "pending").length;
  const totalImpressions = mockCampaigns.reduce(
    (sum, item) => sum + (item.impressions || 0),
    0
  );
  const totalClicks = mockCampaigns.reduce((sum, item) => sum + (item.clicks || 0), 0);

  return (
    <div className="premium-container py-8 md:py-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
            <Megaphone size={14} />
            Smart recommendations powered by partners
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            Marketing
          </h1>

          <p className="mt-3 text-base leading-7 text-gray-600">
            Skapa partnerkampanjer som presenteras som inspiration i en premium-yta.
            Kampanjer publiceras först efter granskning för att skydda kvaliteten och
            användarupplevelsen.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/company/marketing/create"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
          >
            <Plus size={16} />
            Skapa kampanj
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={LayoutTemplate} label="Aktiva kampanjer" value={activeCount} />
        <StatCard icon={Megaphone} label="Pending approval" value={pendingCount} />
        <StatCard icon={Eye} label="Totala visningar" value={totalImpressions} />
        <StatCard icon={MousePointerClick} label="Totala klick" value={totalClicks} />
      </div>

      <div className="mt-8 rounded-[28px] border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white md:p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Din första kampanj är gratis i 3 dagar
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-300 md:text-base">
            Testa partnerplacering i vår inspirationsyta utan kostnad. När du är redo
            kan du fortsätta med fasta veckopriser och begränsade slots.
          </p>

          <div className="mt-6">
            <Link
              to="/company/marketing/create"
              className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
            >
              Skapa din första kampanj
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            Dina kampanjer
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Översikt över status, period och resultat.
          </p>
        </div>

        <div className="space-y-5">
          {mockCampaigns.map((campaign) => (
            <MarketingCampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </div>
    </div>
  );
}