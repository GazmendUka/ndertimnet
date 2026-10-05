import { Link } from "react-router-dom";
export default function OfferAccessLock() {
  return <div className="rounded-xl border p-4"><p>Dërgimi përfshihet në abonim. Nuk ka pagesë për lead ose ofertë.</p><Link to="/company/payments" className="underline">Shiko abonimet</Link></div>;
}
