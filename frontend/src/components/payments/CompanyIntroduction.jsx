import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function CompanyIntroduction() {
  const [allowance, setAllowance] = useState(null);
  useEffect(() => {
    let live = true;
    api.get("billing/catalog/", { skipAuth: true }).then(({ data }) => {
      if (live) setAllowance(data.introductory_offers);
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!Number.isInteger(allowance) || allowance <= 0) return null;
  return <aside className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" aria-label="Oferta hyrëse">
    <strong className="text-base">Filloni me {allowance} oferta falas</strong>
    <p className="mt-1 leading-6">Për kompanitë e reja. Një ofertë konsumohet vetëm kur e nënshkruani dhe e dërgoni. Rishikimet e saj janë falas.</p>
    <p className="mt-1 leading-6">Pa afat skadimi dhe pa abonim automatik.</p>
  </aside>;
}
