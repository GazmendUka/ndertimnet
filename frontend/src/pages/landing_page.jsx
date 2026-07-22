// ===========================================
// src/pages/landing_page.jsx
// Ndertimnet landing page
// ===========================================

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  Factory,
  Hammer,
  HelpCircle,
  Home,
  MapPin,
  MessagesSquare,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import api from "../api/axios";

const defaultHero = {
  title: "Platforma ku klientët gjejnë kompani ndërtimi dhe renovimi.",
  subtitle:
    "Publiko projektin, merr oferta nga kompani serioze dhe zgjidh ekipin e duhur me më shumë qartësi. Për kompanitë, Ndertimnet sjell kërkesa reale nga klientë që duan të fillojnë.",
  imageUrl:
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2200&q=82",
  imageAlt: "Kantier ndërtimi dhe renovimi",
};

const services = [
  { name: "Ndërtim", to: "/ndertime", icon: Hammer },
  { name: "Renovime", to: "/renovime", icon: Wrench },
  { name: "Renovim banjo", to: "/renovim-banjo", icon: Home },
  { name: "Renovim kuzhine", to: "/renovim-kuzhine", icon: Sparkles },
  { name: "Elektricist", to: "/elektricist", icon: Zap },
  { name: "Lyerje", to: "/lyerje", icon: Paintbrush },
  { name: "Fasada", to: "/fasada", icon: Building2 },
  { name: "Pllakashtrues", to: "/pllakashtrues", icon: Factory },
];

const cities = [
  { name: "Prishtinë", to: "/ndertim/prishtine" },
  { name: "Tiranë", to: "/ndertim/tirane" },
  { name: "Prizren", to: "/ndertim/prizren" },
  { name: "Durrës", to: "/ndertim/durres" },
  { name: "Mitrovicë", to: "/ndertim/mitrovice" },
  { name: "Vlorë", to: "/ndertim/vlore" },
];

const proofItems = [
  "Kompani të verifikuara",
  "Projekte reale",
  "Falas për klientët",
  "Kosovë dhe Shqipëri",
];

const steps = [
  {
    title: "Përshkruaj projektin",
    text: "Zgjidh kategorinë, qytetin dhe shkruaj çfarë dëshiron të ndërtosh ose rinovosh.",
    icon: ClipboardList,
  },
  {
    title: "Merr oferta",
    text: "Kompanitë e interesuara e shohin kërkesën dhe përgjigjen me propozime konkrete.",
    icon: MessagesSquare,
  },
  {
    title: "Krahaso dhe zgjidh",
    text: "Vendos më qartë duke krahasuar komunikimin, profilin dhe ofertën e kompanisë.",
    icon: CheckCircle2,
  },
];

const companyBenefits = [
  {
    title: "Kërkesa të strukturuara",
    text: "Çdo projekt vjen me kategori, lokacion dhe përshkrim më të qartë.",
  },
  {
    title: "Më pak kohë e humbur",
    text: "Shiko projekte reale nga klientë që tashmë kanë nevojë konkrete.",
  },
  {
    title: "Prezencë më profesionale",
    text: "Ndërto besim me profil kompanie, kategori shërbimesh dhe komunikim më serioz.",
  },
];

const faqItems = [
  {
    q: "A është Ndertimnet falas për klientët?",
    a: "Po, klientët mund të publikojnë projektin dhe të kërkojnë oferta pa pagesë.",
  },
  {
    q: "Për cilat shërbime mund të publikoj projekt?",
    a: "Për ndërtim, renovim, elektrikë, fasada, dysheme, banjo, kuzhina dhe shërbime të tjera.",
  },
  {
    q: "Si ndihmon platforma kompanitë?",
    a: "Kompanitë mund të shohin kërkesa reale dhe të kontaktojnë klientë që kanë nevojë konkrete.",
  },
  {
    q: "Në cilat tregje fokusohet Ndertimnet?",
    a: "Platforma fokusohet në Kosovë dhe Shqipëri, me lidhje të veçanta për qytetet kryesore.",
  },
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
        Mëso më shumë
        <ArrowRight size={17} />
      </a>
    );
  }

  return (
    <Link to={advertisement.target_url} className={className}>
      Mëso më shumë
      <ArrowRight size={17} />
    </Link>
  );
}

function SectionIntro({ eyebrow, title, text }) {
  return (
    <div className="max-w-3xl">
      <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-[#eaf3ee] px-3 py-1.5 text-xs font-semibold text-[#17643f]">
        <span className="h-2 w-2 rounded-full bg-[#ef7d22]" />
        {eyebrow}
      </div>
      <h2 className="text-[30px] font-semibold leading-tight text-[#12251b] sm:text-[38px]">
        {title}
      </h2>
      {text && <p className="mt-4 text-base leading-7 text-[#5f6f66]">{text}</p>}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [heroAdvertisement, setHeroAdvertisement] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadHeroAdvertisement = async () => {
      try {
        const response = await api.get("reklama/hero/", { skipAuth: true });

        if (isMounted && response.data) {
          setHeroAdvertisement(response.data);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Hero advertisement could not be loaded.", error);
        }
      }
    };

    loadHeroAdvertisement();

    return () => {
      isMounted = false;
    };
  }, []);

  const hero = heroAdvertisement
    ? {
        title: heroAdvertisement.title,
        subtitle: heroAdvertisement.subtitle,
        imageUrl: heroAdvertisement.background_image_url,
        imageAlt: heroAdvertisement.title,
      }
    : defaultHero;

  const openHeroAdvertisement = () => {
    if (!heroAdvertisement?.target_url) {
      return;
    }

    if (heroAdvertisement.link_type === "external") {
      window.open(heroAdvertisement.target_url, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(heroAdvertisement.target_url);
  };

  const handleHeroClick = (event) => {
    if (!heroAdvertisement || event.target.closest("a")) {
      return;
    }

    openHeroAdvertisement();
  };

  const handleHeroKeyDown = (event) => {
    if (!heroAdvertisement || !["Enter", " "].includes(event.key)) {
      return;
    }

    event.preventDefault();
    openHeroAdvertisement();
  };

  return (
    <>
      <Helmet>
        <html lang="sq" />
        <title>
          Kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri | Ndertimnet
        </title>
        <meta
          name="description"
          content="Gjej kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri. Publiko projektin dhe merr oferta nga ndërtues të verifikuar në Prishtinë, Tiranë dhe më shumë."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:locale" content="sq_AL" />
        <meta property="og:site_name" content="Ndertimnet" />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Gjej kompani ndërtimi dhe renovimi | Ndertimnet"
        />
        <meta
          property="og:description"
          content="Publiko projektin dhe merr oferta nga kompani ndërtimi të verifikuara."
        />
        <meta property="og:image" content="https://ndertimnet.com/og-image.jpg" />
        <meta
          property="og:image:alt"
          content="Ndertimnet platform për ndërtim dhe renovim"
        />
        <meta property="og:url" content="https://ndertimnet.com/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ndertimnet" />
        <meta name="twitter:title" content="Ndertimnet - Ndërtim dhe renovim" />
        <meta
          name="twitter:description"
          content="Platforma që lidh klientët me kompani ndërtimi dhe renovimi."
        />
        <meta name="twitter:image" content="https://ndertimnet.com/og-image.jpg" />
        <link rel="canonical" href="https://ndertimnet.com/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "Ndertimnet",
                url: "https://ndertimnet.com",
                logo: "https://ndertimnet.com/logo512.png",
              },
              {
                "@type": "WebSite",
                url: "https://ndertimnet.com",
                potentialAction: {
                  "@type": "SearchAction",
                  target:
                    "https://ndertimnet.com/search?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "Service",
                name: "Ndërtim dhe renovim",
                areaServed: ["Kosovë", "Shqipëri"],
                provider: {
                  "@type": "Organization",
                  name: "Ndertimnet",
                },
              },
            ],
          })}
        </script>
      </Helmet>

      <div className="bg-white text-[#12251b]">
        <section
          className={`relative overflow-hidden bg-[#12251b] ${heroAdvertisement ? "cursor-pointer" : ""}`}
          role={heroAdvertisement ? "link" : undefined}
          tabIndex={heroAdvertisement ? 0 : undefined}
          onClick={handleHeroClick}
          onKeyDown={handleHeroKeyDown}
          aria-label={heroAdvertisement ? `Hap reklamën: ${heroAdvertisement.title}` : undefined}
        >
          <img
            src={hero.imageUrl}
            alt={hero.imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#12251b]/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#12251b]/85" />

          <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="max-w-4xl pt-4">
              <div className="mb-5 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
                <MapPin size={16} />
                {heroAdvertisement ? "Reklamë" : "Kosovë dhe Shqipëri"}
              </div>

              <h1 className="max-w-4xl text-[36px] font-semibold leading-[1.05] text-white sm:text-[58px] lg:text-[72px]">
                {hero.title}
              </h1>

              {hero.subtitle && (
                <p className="mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
                  {hero.subtitle}
                </p>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {heroAdvertisement ? (
                  <HeroAdvertisementButton advertisement={heroAdvertisement} />
                ) : (
                  <>
                    <PrimaryButton to="/login">Publiko projekt</PrimaryButton>
                    <SecondaryButton to="/register/company">
                      Regjistro kompaninë
                    </SecondaryButton>
                    <a
                      href="#si-funksionon"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white underline-offset-4 hover:underline sm:px-6"
                    >
                      Shiko si funksionon
                    </a>
                  </>
                )}
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

        <section className="border-b border-[#e5e0d5] bg-[#f7f4ee]">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            <TrustItem icon={ShieldCheck} text="Proces i thjeshtë për klientë" />
            <TrustItem icon={BadgeCheck} text="Leads reale për kompani" />
            <TrustItem icon={Hammer} text="Shërbime në shumë kategori" />
            <TrustItem icon={MapPin} text="Fokus në Kosovë dhe Shqipëri" />
          </div>
        </section>

        <section id="si-funksionon" className="py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <SectionIntro
                eyebrow="Për klientët"
                title="Nga ideja te oferta, pa humbur kohë në kërkime të pafundme."
                text="Në vend që të kërkoni kompani një nga një, publikoni projektin tuaj në një vend dhe lejoni kompanitë e interesuara të përgjigjen me oferta konkrete."
              />
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-[#ef7d22] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d96814]"
                >
                  Publiko projekt
                </Link>
                <a
                  href="#sherbimet"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#d7d0c2] px-6 py-3 text-sm font-semibold text-[#12251b] transition hover:border-[#17643f]"
                >
                  Shiko shërbimet
                </a>
              </div>
            </div>

            <div className="grid gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.title}
                    className="grid gap-4 rounded-lg border border-[#e5e0d5] bg-white p-5 sm:grid-cols-[64px_1fr]"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#eaf3ee] text-[#17643f]">
                      <Icon size={25} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#ef7d22]">
                        Hapi {index + 1}
                      </div>
                      <h3 className="mt-1 text-xl font-semibold text-[#12251b]">
                        {step.title}
                      </h3>
                      <p className="mt-2 leading-7 text-[#5f6f66]">{step.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#12251b] py-20 text-white sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-8">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-[#ef7d22]" />
                Për kompanitë
              </div>
              <h2 className="text-[30px] font-semibold leading-tight sm:text-[38px]">
                Më shumë projekte reale, më pak kohë e humbur në kërkim klientësh.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
                Ndertimnet është kanal serioz për kompani ndërtimi, renovimi dhe
                shërbime profesionale që duan kërkesa të strukturuara.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton to="/register/company">
                  Regjistro kompaninë
                </PrimaryButton>
                <SecondaryButton to="/contact">Kontakto</SecondaryButton>
              </div>

              <div className="mt-8 grid gap-3">
                {companyBenefits.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-lg border border-white/15 bg-white/10 p-4"
                  >
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/70">{item.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white p-4 text-[#12251b] shadow-2xl sm:p-5">
              <div className="flex items-center justify-between gap-4 border-b border-[#e8e2d8] pb-4">
                <div>
                  <div className="text-sm font-semibold text-[#ef7d22]">
                    Paneli i kompanisë
                  </div>
                  <h3 className="mt-1 text-2xl font-semibold">Kërkesa të reja</h3>
                </div>
                <span className="rounded-md bg-[#eaf3ee] px-3 py-1.5 text-xs font-semibold text-[#17643f]">
                  3 të reja
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[160px_1fr]">
                <div className="grid gap-3">
                  <DashboardMetric label="Leads aktive" value="12" />
                  <DashboardMetric label="Qytete" value="4" />
                  <DashboardMetric label="Kategori" value="8" />
                </div>
                <div className="grid gap-3">
                  <LeadItem title="Ndërtim shtëpie" meta="Prizren · projekt familjar" />
                  <LeadItem title="Renovim banjo" meta="Tiranë · kërkohet ofertë" />
                  <LeadItem title="Fasadë objekti" meta="Prishtinë · kompani e verifikuar" />
                  <LeadItem title="Instalim elektrik" meta="Durrës · apartament" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="Pse Ndertimnet"
              title="Një mënyrë më e thjeshtë për të nisur projektin dhe për të gjetur klientë të rinj."
              text="Platforma është krijuar për të sjellë më shumë qartësi, besim dhe strukturë në tregun e ndërtimit dhe renovimit."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={ShieldCheck}
                title="Besim më i lartë"
                text="Komunikim më profesional për kompanitë, projektet dhe procesin e ofertimit."
              />
              <FeatureCard
                icon={Users}
                title="Më e lehtë për klientin"
                text="Vizitori kupton shpejt çfarë duhet të bëjë dhe si nis procesi."
              />
              <FeatureCard
                icon={Star}
                title="Shërbime të qarta"
                text="Gjeni kompani sipas qytetit, kategorisë dhe llojit të projektit."
              />
            </div>
          </div>
        </section>

        <section id="sherbimet" className="bg-[#f7f4ee] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="Shërbime dhe qytete"
              title="Gjej kompani ndërtimi dhe renovimi sipas qytetit ose shërbimit."
              text="Zgjidh kategorinë që i përshtatet projektit tuaj dhe shiko mundësitë sipas qyteteve kryesore."
            />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <Link
                    key={service.name}
                    to={service.to}
                    className="group rounded-lg border border-[#e5e0d5] bg-white p-5 transition hover:border-[#17643f]/40"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eaf3ee] text-[#17643f]">
                      <Icon size={22} />
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#12251b]">
                        {service.name}
                      </span>
                      <ArrowRight
                        size={17}
                        className="text-[#9b7560] transition group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city.name}
                  to={city.to}
                  className="flex items-center justify-between rounded-lg border border-[#e5e0d5] bg-white px-5 py-4 transition hover:border-[#17643f]/40"
                  aria-label={`Kompani ndërtimi në ${city.name}`}
                >
                  <span>
                    <strong className="block text-[#12251b]">{city.name}</strong>
                    <span className="text-sm text-[#5f6f66]">
                      Kompani ndërtimi
                    </span>
                  </span>
                  <MapPin size={19} className="text-[#ef7d22]" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionIntro
              eyebrow="Pyetje të shpeshta"
              title="Përgjigje të shkurtra përpara se të filloni."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {faqItems.map((item) => (
                <article
                  key={item.q}
                  className="rounded-lg border border-[#e5e0d5] bg-white p-5"
                >
                  <div className="flex gap-3">
                    <HelpCircle size={21} className="mt-1 shrink-0 text-[#ef7d22]" />
                    <div>
                      <h3 className="font-semibold text-[#12251b]">{item.q}</h3>
                      <p className="mt-2 leading-7 text-[#5f6f66]">{item.a}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#12251b] py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <h2 className="max-w-3xl text-[30px] font-semibold leading-tight sm:text-[40px]">
                Filloni me projektin tuaj ose regjistroni kompaninë në Ndertimnet.
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/70">
                Publikoni projektin për të marrë oferta, ose regjistroni kompaninë
                tuaj për të parë kërkesa të reja nga klientë që kanë nevojë për
                ndërtim dhe renovim.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <PrimaryButton to="/login">Publiko projekt</PrimaryButton>
              <SecondaryButton to="/register/company">
                Regjistro kompaninë
              </SecondaryButton>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function TrustItem({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#12251b]">
      <Icon size={19} className="shrink-0 text-[#17643f]" />
      {text}
    </div>
  );
}

function DashboardMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f6f3ee] p-4">
      <div className="text-sm text-[#65756d]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#12251b]">{value}</div>
    </div>
  );
}

function LeadItem({ title, meta }) {
  return (
    <article className="flex items-center justify-between gap-4 rounded-lg border border-[#e8e2d8] bg-white p-4">
      <div>
        <strong className="block text-sm text-[#12251b]">{title}</strong>
        <span className="mt-1 block text-xs text-[#65756d]">{meta}</span>
      </div>
      <span className="rounded-md bg-[#fff2e8] px-2.5 py-1 text-xs font-semibold text-[#b85a13]">
        I ri
      </span>
    </article>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <article className="rounded-lg border border-[#e5e0d5] bg-white p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#eaf3ee] text-[#17643f]">
        <Icon size={23} />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-[#12251b]">{title}</h3>
      <p className="mt-3 leading-7 text-[#5f6f66]">{text}</p>
    </article>
  );
}
