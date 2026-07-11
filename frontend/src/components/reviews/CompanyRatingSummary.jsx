import { Star, ThumbsUp } from "lucide-react";

export default function CompanyRatingSummary({ summary, compact = false, inverse = false }) {
  const count = summary?.count || 0;
  const average = summary?.average;
  const muted = inverse ? "text-gray-300" : "text-gray-500";
  const reviewLabel = count === 1 ? "vlerësim i verifikuar" : "vlerësime të verifikuara";

  if (!count) {
    return <span className={`text-sm ${muted}`}>Ende pa vlerësime</span>;
  }

  if (compact) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
        <Star size={16} className="fill-amber-400 text-amber-400" />
        <strong>{Number(average).toFixed(1)}</strong>
        <span className={muted}>· {count} {reviewLabel}</span>
      </span>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">{Number(average).toFixed(1)}</span>
          <span className={`pb-1 text-sm ${muted}`}>nga 5</span>
        </div>
        <div className="mt-2 flex gap-1" aria-label={`${average} nga 5 yje`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={18} className={star <= Math.round(average) ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
          ))}
        </div>
        <p className={`mt-2 text-xs ${muted}`}>{count} {reviewLabel}</p>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const value = summary?.distribution?.[String(star)] || 0;
          const width = count ? Math.round((value / count) * 100) : 0;
          return (
            <div key={star} className="grid grid-cols-[14px_1fr_28px] items-center gap-2 text-xs">
              <span>{star}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <span className="block h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
              </span>
              <span className={`text-right ${muted}`}>{value}</span>
            </div>
          );
        })}
        {summary?.recommended_percentage !== null && (
          <p className="flex items-center gap-2 pt-2 text-sm font-medium text-emerald-700">
            <ThumbsUp size={15} /> {summary.recommended_percentage}% e rekomandojnë
          </p>
        )}
      </div>
    </div>
  );
}
