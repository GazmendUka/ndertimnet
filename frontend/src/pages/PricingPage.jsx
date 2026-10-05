import { Helmet } from "react-helmet";
import { PublicSubscriptionPricing } from "../components/payments/PlatformBilling";
export default function PricingPage() {
  return <main className="premium-container py-12"><Helmet><title>Standard dhe Pro | Ndertimnet</title></Helmet><h1 className="page-title mb-6">Çmimet për kompanitë</h1><PublicSubscriptionPricing /></main>;
}
