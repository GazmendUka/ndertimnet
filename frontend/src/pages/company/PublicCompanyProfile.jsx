import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, CheckCircle2, Globe, MapPin, ShieldCheck, Star } from "lucide-react";
import { Helmet } from "react-helmet";
import api from "../../api/axios";
import CompanyRatingSummary from "../../components/reviews/CompanyRatingSummary";
import CompanyReviews from "../../components/reviews/CompanyReviews";

export default function PublicCompanyProfile() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadCompany() {
      try {
        const response = await api.get(`/accounts/companies/${companyId}/public/`);
        if (active) setCompany(response.data);
      } catch (requestError) {
        if (active) setError("Kompania nuk u gjet ose profili nuk është publik.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCompany();
    return () => { active = false; };
  }, [companyId]);

  if (loading) return (
    <div className="premium-container animate-pulse py-10" aria-label="Duke ngarkuar profilin e kompanisë">
      <div className="h-56 rounded-3xl bg-gray-200" />
      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-72 rounded-2xl bg-gray-100" />
        <div className="h-72 rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
  if (error || !company) return <div className="premium-container py-16"><div className="premium-card p-8 text-red-700">{error}</div></div>;

  return (
    <main className="premium-container py-8 md:py-12">
      <Helmet>
        <title>{company.company_name} – Vlerësime dhe profil | Ndertimnet</title>
        <meta name="description" content={`Shiko profilin, shërbimet dhe vlerësimet e verifikuara për ${company.company_name} në Ndertimnet.`} />
      </Helmet>

      <section className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-xl shadow-gray-200/70">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative p-6 sm:p-9 lg:p-12">
          <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.company_name} className="h-20 w-20 rounded-2xl bg-white object-contain p-2" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10"><Building2 size={34} /></div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold">{company.company_name}</h1>
                  {company.is_verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      <ShieldCheck size={14} /> E verifikuar
                    </span>
                  )}
                </div>
                <div className="mt-3"><CompanyRatingSummary summary={company.rating_summary} compact inverse /></div>
                {(company.city?.name || company.professions_detail?.length > 0) && (
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-300">
                    {company.city?.name && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {company.city.name}</span>}
                    {company.city?.name && company.professions_detail?.length > 0 && <span>·</span>}
                    {company.professions_detail?.length > 0 && <span>{company.professions_detail.slice(0, 2).map((profession) => profession.name).join(", ")}</span>}
                  </p>
                )}
              </div>
            </div>
            <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold">Keni një projekt?</p>
              <p className="mt-1 text-xs leading-5 text-gray-300">Përshkruani punën dhe merrni oferta nga profesionistët.</p>
              <Link to="/customer/jobrequests/create" className="premium-btn mt-4 flex w-full justify-center bg-white text-gray-900 hover:bg-gray-100">Kërko ofertë</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <TrustItem icon={<ShieldCheck size={17} />} title="Vlerësime të verifikuara" text="Vetëm nga punë të pranuara" />
        <TrustItem icon={<Star size={17} />} title="Përvoja reale" text="Nga klientë të Ndertimnet" />
        <TrustItem icon={<CheckCircle2 size={17} />} title="Profil transparent" text="Shërbime dhe reputacion në një vend" />
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-7">
          <section className="premium-card p-6 sm:p-8">
            <p className="text-label">Rreth kompanisë</p>
            <h2 className="mt-1 text-xl font-semibold">Profili i kompanisë</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700">{company.description || "Kompania nuk ka shtuar ende një përshkrim."}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-600">
              {(company.city?.name || company.cities_detail?.length > 0) && (
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2"><MapPin size={15} /> {company.city?.name || company.cities_detail.map((city) => city.name).join(", ")}</span>
              )}
              {company.website && (
                <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 hover:bg-gray-200"><Globe size={15} /> Webbplats</a>
              )}
            </div>
            {company.professions_detail?.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {company.professions_detail.map((profession) => <span key={profession.id} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium">{profession.name}</span>)}
              </div>
            )}
          </section>

          <section className="premium-card p-6 sm:p-8">
            <p className="text-label">Përvoja të verifikuara</p>
            <h2 className="mt-1 text-xl font-semibold">Vlerësimet e klientëve</h2>
            <div className="mt-6"><CompanyReviews companyId={company.id} showAll /></div>
          </section>
        </div>

        <aside className="premium-card p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold">Përmbledhja e vlerësimeve</h2>
          <div className="mt-5"><CompanyRatingSummary summary={company.rating_summary} /></div>
          <p className="mt-5 text-xs leading-5 text-gray-500">Vetëm klientët me ofertë të pranuar mund të lënë vlerësim. Çdo vlerësim shënohet si punë e verifikuar.</p>
        </aside>
      </div>
    </main>
  );
}

function TrustItem({ icon, title, text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{text}</span>
      </span>
    </div>
  );
}
