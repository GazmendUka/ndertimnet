import { useEffect, useState } from "react";
import { billingService } from "../../services/billingService";

export function OfferAllowanceSummary({ overview }) {
  if (!overview || (!overview.introductory_offers_granted && !overview.free_offers_remaining)) return null;
  return <aside className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950" aria-label="Ofertat hyrëse falas">
    <h3 className="text-sm font-semibold">Ofertat hyrëse falas</h3>
    <p className="mt-1 text-xl font-semibold">{overview.free_offers_remaining}{overview.introductory_offers_granted > 0 ? ` nga ${overview.introductory_offers_granted}` : ""} të mbetura</p>
    <p className="mt-1 text-sm leading-6">Pa afat skadimi. Pa abonim automatik. Rishikimet e së njëjtës ofertë nuk konsumojnë kuotë tjetër.</p>
  </aside>;
}

export default function CompanyOfferAllowance() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(false);
  const load = () => billingService.subscription().then(({ data }) => { setOverview(data.overview); setError(false); }).catch(() => setError(true));
  useEffect(() => {
    let live = true;
    billingService.subscription().then(({ data }) => { if (live) setOverview(data.overview); }).catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, []);
  return error ? <p className="text-sm text-gray-600" role="status">Kuota nuk mund të ngarkohet. <button type="button" className="min-h-[44px] underline" onClick={load}>Provo përsëri</button></p> : <OfferAllowanceSummary overview={overview} />;
}
