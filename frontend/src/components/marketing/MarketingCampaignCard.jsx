// 1) src/components/marketing/MarketingCampaignCard.jsx
import { CalendarDays, Eye, MousePointerClick, Clock3 } from "lucide-react";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
  active: "Active",
  rejected: "Rejected",
  expired: "Expired",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function MarketingCampaignCard({ campaign }) {
  const statusClass =
    STATUS_STYLES[campaign.status] || "bg-gray-100 text-gray-700 border-gray-200";

  const statusLabel = STATUS_LABELS[campaign.status] || campaign.status;

  return (
    <article className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="grid md:grid-cols-[220px_1fr]">
        <div className="bg-gray-100 aspect-[16/10] md:aspect-auto">
          {campaign.image ? (
            <img
              src={campaign.image}
              alt={campaign.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
              Ingen bild
            </div>
          )}
        </div>

        <div className="p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              <h3 className="text-xl font-semibold tracking-tight text-gray-900">
                {campaign.title}
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                {campaign.description || "Ingen beskrivning angiven."}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                <CalendarDays size={14} />
                Period
              </div>
              <div className="mt-2 text-sm font-medium text-gray-900">
                {formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                <Clock3 size={14} />
                Placement
              </div>
              <div className="mt-2 text-sm font-medium text-gray-900">
                {campaign.placement_label || "Hero / Inspiration"}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                <Eye size={14} />
                Visningar
              </div>
              <div className="mt-2 text-sm font-medium text-gray-900">
                {campaign.impressions ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                <MousePointerClick size={14} />
                Klick
              </div>
              <div className="mt-2 text-sm font-medium text-gray-900">
                {campaign.clicks ?? 0}
              </div>
            </div>
          </div>

          {campaign.rejection_reason ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Orsak till avslag</p>
              <p className="mt-1 text-sm text-red-700">{campaign.rejection_reason}</p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}