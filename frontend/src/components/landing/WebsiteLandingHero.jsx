import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";

// Preserve the existing website Hero independently of the native app layout.
const defaultHero = {
  title: "Gjeni kompaninë për projektin tuaj.",
  subtitle:
    "Publiko projektin me ofertën hyrëse 0 € dhe merr oferta nga kompani të interesuara. Krahaso mundësitë dhe zgjidh ekipin që të përshtatet.",
  imageUrl:
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2200&q=82",
  imageAlt: "Kantier ndërtimi dhe renovimi",
};

const proofItems = [
  "Kompani të verifikuara",
  "Projekte reale",
  "Falas për klientët",
  "Kosovë dhe Shqipëri",
];

function PrimaryButton({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#ef7d22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d96814] sm:px-6"
    >
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}

function SecondaryButton({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:px-6"
    >
      {children}
    </Link>
  );
}

function HeroAdvertisementButton({ advertisement }) {
  const className =
    "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#ef7d22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d96814] sm:px-6";

  if (advertisement.link_type === "external") {
    return (
      <a
        href={advertisement.target_url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {advertisement.cta_text || "Mëso më shumë"}
        <ArrowRight size={17} />
      </a>
    );
  }

  return (
    <Link to={advertisement.target_url} className={className}>
      {advertisement.cta_text || "Mëso më shumë"}
      <ArrowRight size={17} />
    </Link>
  );
}

function SponsoredHeroAdvertisement({ advertisement }) {
  return (
    <section aria-label="Përmbajtje e sponsorizuar" className="border-b border-[#e5e0d5] bg-[#f7f4ee] py-5 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <article className="overflow-hidden rounded-2xl border border-[#ddd6c9] bg-white shadow-sm lg:grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative aspect-[16/9] min-h-[210px] overflow-hidden lg:aspect-auto lg:min-h-[320px]">
            <img
              src={advertisement.background_image_url}
              alt={advertisement.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#12251b] shadow-sm backdrop-blur">
              Reklamë
            </span>
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6b60]">
              Përmbajtje e sponsorizuar
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-[#12251b] sm:text-3xl">
              {advertisement.title}
            </h1>
            {advertisement.subtitle && (
              <p className="mt-3 line-clamp-3 leading-7 text-[#5f6f66]">
                {advertisement.subtitle}
              </p>
            )}
            {advertisement.company_name && <p className="mt-3 text-sm text-[#5f6f66]">Partneri: {advertisement.company_name}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <HeroAdvertisementButton advertisement={advertisement} />
              <Link to="/nis-projektin" className="inline-flex min-h-[48px] items-center font-semibold text-[#17643f] underline">Fillo projektin</Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default function WebsiteLandingHero({ advertisement }) {
  const heroAdvertisement = advertisement;
  return (<>
        {heroAdvertisement ? <SponsoredHeroAdvertisement advertisement={heroAdvertisement} /> : (
        <section className="relative overflow-hidden bg-[#12251b]">
          <img
            src={defaultHero.imageUrl}
            alt={defaultHero.imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#12251b]/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#12251b]/85" />

          <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
            <div className="max-w-4xl sm:py-2">
              <div className="mb-5 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
                <MapPin size={16} />
                Kosovë dhe Shqipëri
              </div>

              <h1 className="max-w-4xl text-[36px] font-semibold leading-[1.06] text-white sm:text-[56px] lg:text-[68px]">
                {defaultHero.title}
              </h1>

              <p className="mt-4 text-xl font-medium text-white sm:text-2xl">Nga ideja te Shtëpia juaj</p>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:mt-6 sm:text-lg sm:leading-8">
                {defaultHero.subtitle}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                <PrimaryButton to="/nis-projektin">Fillo projektin</PrimaryButton>
                <SecondaryButton to="/register/company">Për kompanitë</SecondaryButton>
              </div>

              <div className="mt-8 hidden flex-wrap gap-2 sm:flex">
                {proofItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </section>

        )}

  </>);
}
