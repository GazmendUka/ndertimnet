import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, ShieldCheck, Star, ThumbsUp } from "lucide-react";
import api from "../../api/axios";

export default function CompanyReviews({ companyId, initialLimit = 3, showAll = false, emptyMessage = "Ende nuk ka vlerësime të publikuara." }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setPage(1);
    setReviews([]);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    let active = true;

    async function loadReviews() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/accounts/companies/${companyId}/reviews/`, {
          params: { page, page_size: showAll ? 10 : initialLimit },
        });
        if (!active) return;
        setReviews((current) => page === 1 ? response.data.results : [...current, ...response.data.results]);
        setHasNext(Boolean(response.data.has_next));
      } catch (requestError) {
        if (active) setError("Vlerësimet nuk mund të ngarkohen tani.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReviews();
    return () => { active = false; };
  }, [companyId, initialLimit, page, reloadKey, showAll]);

  if (loading && page === 1) {
    return (
      <div className="space-y-4" aria-label="Duke ngarkuar vlerësimet">
        {[1, 2].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-gray-100 p-5">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="mt-4 h-3 w-full rounded bg-gray-100" />
            <div className="mt-2 h-3 w-4/5 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }
  if (error) return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      <p className="flex items-center gap-2"><AlertCircle size={16} /> {error}</p>
      <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-3 inline-flex items-center gap-1.5 font-semibold hover:text-red-900">
        <RefreshCw size={14} /> Provo përsëri
      </button>
    </div>
  );
  if (!reviews.length) return <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm leading-6 text-gray-500">{emptyMessage}</p>;

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article key={review.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">{review.customer_name}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700">
                <ShieldCheck size={13} /> Punë e verifikuar
              </p>
            </div>
            <div className="flex gap-0.5" aria-label={`${review.rating} nga 5 yje`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={16} className={star <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
              ))}
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700">{review.review_text}</p>
          {review.recommended && (
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <ThumbsUp size={13} /> E rekomandon kompaninë
            </span>
          )}
          {review.image_url && <img src={review.image_url} alt="Puna e përfunduar" loading="lazy" className="mt-4 max-h-72 w-full rounded-xl object-cover" />}
          <p className="mt-4 text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString("sq-AL")}</p>
        </article>
      ))}
      {showAll && hasNext && (
        <button type="button" onClick={() => setPage((current) => current + 1)} disabled={loading} className="premium-btn btn-light w-full">
          {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={15} /> Duke ngarkuar…</span> : "Shfaq më shumë vlerësime"}
        </button>
      )}
    </div>
  );
}
