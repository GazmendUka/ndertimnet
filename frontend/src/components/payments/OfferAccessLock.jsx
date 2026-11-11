import { Link } from "react-router-dom";
import { isIOSApp } from "../../platform/iosAccess";

export default function OfferAccessLock() {
  return <div className="rounded-xl border p-4">
    <p>{isIOSApp() ? "Nuk keni kuotë të disponueshme për të dërguar një ofertë të re." : "Dërgimi përfshihet në abonim. Nuk ka pagesë për lead ose ofertë."}</p>
    {!isIOSApp() && <Link to="/company/payments" className="underline">Shiko abonimet</Link>}
  </div>;
}
