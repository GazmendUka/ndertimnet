import { useState } from "react";
import { Link } from "react-router-dom";
import CompanyRatingSummary from "../reviews/CompanyRatingSummary";

export function offerPrice(version) {
  if (!version || version.price_amount == null) return "Pa çmim";
  const amount = `${version.price_amount} ${version.currency || "EUR"}`;
  if (version.price_type === "hourly") return `${amount}/orë${version.estimated_total != null ? ` · Vlerësim: ${version.estimated_total} ${version.currency || "EUR"}` : " · Totali nuk është përcaktuar"}`;
  return `${amount} · ${version.price_type === "fixed" ? "Çmim fiks" : "Vlerësim"}`;
}
export default function OfferComparison({ offers }) {
  const [selected, setSelected] = useState([]);
  const eligible = offers.filter(o => o.current_version?.is_signed);
  const compared = eligible.filter(o => selected.includes(o.id));
  if (eligible.length < 2) return null;
  const rows = [
    ["Çmimi", o => offerPrice(o.current_version)],
    ["Përfshihet (puna/materialet)", o => o.current_version.includes_text],
    ["Nuk përfshihet", o => o.current_version.excludes_text],
    ["Fillimi", o => o.current_version.can_start_from],
    ["Kohëzgjatja", o => o.current_version.duration_text],
    ["Kushtet e pagesës", o => o.current_version.payment_terms],
    ["Verifikimi i kompanisë", o => o.company?.is_verified ? "E verifikuar" : "Pa verifikim"],
    ["Vlerësimet nga klientët", o => <CompanyRatingSummary summary={o.company?.rating_summary} compact />],
  ];
  return <section className="premium-card p-4 mb-5 min-w-0">
    <h3 className="font-semibold">Krahasoni ofertat</h3>
    <p className="text-sm text-gray-600 mt-1">Zgjidhni 2–3 kompani. Çmimi për orë nuk është çmim total; kontrolloni çfarë përfshihet.</p>
    <div className="flex flex-wrap gap-3 my-4">{eligible.map(o => <label key={o.id} className="flex items-center gap-2"><input type="checkbox" checked={selected.includes(o.id)} disabled={compared.length >= 3 && !selected.includes(o.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, o.id] : ids.filter(id => id !== o.id))} />{o.company?.company_name || "Kompani"}</label>)}</div>
    {compared.length >= 2 && <p className="text-xs text-gray-500 mb-2">Rrëshqitni tabelën anash për të parë të gjitha kompanitë.</p>}
    {compared.length >= 2 && <div className="overflow-x-auto" tabIndex={0} aria-label="Tabela e krahasimit"><table className="w-full text-sm text-left border-collapse"><caption className="text-left mb-2">Versionet e fundit të dërguara — hapni ofertën për detajet dhe ndryshimet.</caption><thead><tr><th className="p-3">Detajet</th>{compared.map(o => <th key={o.id} className="p-3 min-w-[200px]"><Link className="underline" to={`/customer/offers/${o.id}`}>{o.company?.company_name}</Link><p className="font-normal">Versioni {o.current_version.version_number}</p></th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label} className="border-t"><th scope="row" className="p-3 align-top">{label}</th>{compared.map(o => <td key={o.id} className="p-3 align-top whitespace-pre-wrap break-words max-w-xs">{value(o) || "Nuk është specifikuar"}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}
