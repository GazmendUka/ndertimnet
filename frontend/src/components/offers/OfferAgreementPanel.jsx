import { useEffect, useState } from "react";
import api from "../../api/axios";

function VersionText({ version: v }) {
  return <div className="space-y-2 text-sm whitespace-pre-wrap">
    <p><strong>Çmimi:</strong> {v.price_amount} {v.currency} {v.price_type === "hourly" ? "/ orë" : "(fiks)"}</p>
    {v.price_type === "hourly" && <p>{v.estimated_hours} orë të vlerësuara · Total i vlerësuar: {v.estimated_total} €</p>}
    <p><strong>Fillimi:</strong> {v.can_start_from || "—"} · {v.duration_text}</p>
    <p>{v.presentation_text}</p>
    <p><strong>Përfshihet:</strong> {v.includes_text || "—"}</p>
    <p><strong>Nuk përfshihet:</strong> {v.excludes_text || "—"}</p>
    <p><strong>Kushtet e pagesës:</strong> {v.payment_terms || "—"}</p>
    {v.customer_accepted_at && <p>Pranuar: {new Date(v.customer_accepted_at).toLocaleString("sq-AL")}</p>}
    {v.customer_rejected_at && <p>Refuzuar: {new Date(v.customer_rejected_at).toLocaleString("sq-AL")}</p>}
  </div>;
}

export default function OfferAgreementPanel({ offer }) {
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState(false);
  const id = offer?.id;
  const currentId = offer?.current_version?.id;
  const acceptedId = offer?.accepted_version?.id;
  const rejectedAt = offer?.current_version?.customer_rejected_at;
  useEffect(() => {
    let live = true;
    api.get(`offers/${id}/versions/`).then(r => { if (live) { setVersions(r.data); setError(false); } }).catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [id, currentId, acceptedId, rejectedAt]);
  return <section className="premium-card p-5 space-y-4">
    <p className="text-sm">Mund të flisni me telefon ose në bisedë pasi oferta të dërgohet dhe tarifa të jetë paguar ose e përfshirë. Dokumentoni këtu çmimin dhe punën që bini dakord; konfirmoni ndryshimet që të keni të dy një histori të përbashkët.</p>
    {offer.accepted_version && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <h2 className="font-semibold mb-3">Marrëveshja e pranuar — v{offer.accepted_version.version_number}</h2>
      <VersionText version={offer.accepted_version} />
    </div>}
    {offer.pending_amendment && <p className="rounded-lg bg-amber-50 p-3 font-semibold">Ka ndryshime në pritje. Marrëveshja e mësipërme mbetet e pranuar derisa klienti të miratojë versionin e ri.</p>}
    <details><summary className="cursor-pointer font-semibold">Historiku i versioneve</summary>
      {error && <p role="alert">Historiku nuk u ngarkua. Hapni faqen përsëri.</p>}
      {versions.map(v => <details key={v.id} className="border-t py-3"><summary>Versioni {v.version_number} · {v.customer_accepted_at ? "Pranuar" : v.customer_rejected_at ? "Refuzuar" : v.is_signed ? "Dërguar" : "Draft"}</summary><VersionText version={v} /></details>)}
    </details>
  </section>;
}
