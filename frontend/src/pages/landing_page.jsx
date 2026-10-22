// ===========================================
// src/pages/landing_page.jsx
// Ndertimnet landing page
// ===========================================

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Capacitor } from "@capacitor/core";
import WebsiteLandingHero from "../components/landing/WebsiteLandingHero";
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
  X,
  Zap,
} from "lucide-react";
import api from "../api/axios";
import { PublicSubscriptionPricing } from "../components/payments/PlatformBilling";

const defaultHero = {
  title: "Gjeni profesionistin e duhur.",
};

const exampleCampaign = {
  title: "Biznesi juaj, në qendër të vëmendjes",
  subtitle: "Prezantoni shërbimet tuaja me një imazh, një përshkrim dhe një lidhje.",
  background_image_url: "/campaign-example.svg",
  cta_text: "Mëso më shumë",
  company_name: "Biznesi juaj",
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
    a: "Publikimi ka një çmim të planifikuar dhe një ofertë hyrëse. Çmimi dhe zbritja shfaqen para dërgimit të kërkesës.",
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

function HeroAdvertisementButton({ advertisement, example = false }) {
  const className =
    "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#ef7d22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d96814] sm:px-6";

  if (example) {
    return <span className={className}>{advertisement.cta_text}<ArrowRight size={17} /></span>;
  }

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

function HeroAdvertisementCard({ advertisement, example = false }) {
  const Heading = example ? "h3" : "h2";
  return (
    <article className="overflow-hidden rounded-2xl border border-[#ddd6c9] bg-white">
      <div className="flex min-h-[36px] items-center justify-between gap-3 px-4 py-2 text-xs text-[#5f6f66]">
        <span className="shrink-0 font-semibold text-[#17643f]">{example ? "Shembull" : "Reklamë"}</span>
        {advertisement.company_name && <span className="min-w-0 truncate">Partneri: {advertisement.company_name}</span>}
      </div>
      <div className="aspect-[2/1] bg-[#eeeae2]">
        <img
          src={advertisement.background_image_url}
          alt={advertisement.title}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0 max-w-3xl break-words">
          <Heading className="text-xl font-semibold leading-tight text-[#12251b] sm:text-2xl">
            {advertisement.title}
          </Heading>
          {advertisement.subtitle && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5f6f66]">
              {advertisement.subtitle}
            </p>
          )}
        </div>
        <div className="shrink-0"><HeroAdvertisementButton advertisement={advertisement} example={example} /></div>
      </div>
    </article>
  );
}

function SponsoredHeroAdvertisement({ advertisement }) {
  return (
    <section aria-label="Përmbajtje e sponsorizuar" className="bg-[#f7f4ee] pb-5 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <HeroAdvertisementCard advertisement={advertisement} />
      </div>
    </section>
  );
}

function CampaignExampleDialog({ onClose, returnFocusRef }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = returnFocusRef.current || document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      id="campaign-example"
      aria-labelledby="campaign-example-title"
      aria-describedby="campaign-example-description"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 text-[#12251b] shadow-2xl backdrop:bg-black/50 sm:p-6"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll("a[href], button:not([disabled])");
        const first = controls[0];
        const last = controls[controls.length - 1];
        if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 id="campaign-example-title" className="pt-2 text-xl font-semibold leading-tight sm:text-2xl">Kështu mund të duket fushata juaj</h2>
        <button type="button" onClick={onClose} autoFocus aria-label="Mbyll shembullin" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f7f4ee]">
          <X size={20} />
        </button>
      </div>
      <p id="campaign-example-description" className="mb-4 text-sm leading-6 text-[#5f6f66]">Ky është vetëm një shembull ilustrues, jo një reklamë e publikuar.</p>
      <HeroAdvertisementCard advertisement={exampleCampaign} example />
      <p className="my-4 text-sm leading-6 text-[#5f6f66]">Fushata juaj shfaqet në këtë hapësirë në Ballina, në faqe dhe në aplikacion, pas miratimit. Butoni lidhet me faqen që zgjidhni ju.</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <PrimaryButton to="/register/company">Regjistro kompaninë</PrimaryButton>
        <Link to="/login" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#17643f] underline underline-offset-4">Kam llogari – Kyçu</Link>
      </div>
    </dialog>
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
  const isNativeApp = Capacitor.isNativePlatform();
  const [heroAdvertisement, setHeroAdvertisement] = useState(null);
  const [exampleOpen, setExampleOpen] = useState(false);
  const exampleTriggerRef = useRef(null);

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
          console.warn("Hero advertisement could not be loaded.");
        }
      }
    };

    loadHeroAdvertisement();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Helmet>
        <html lang="sq" />
        <title>
          Gjeni kompaninë për projektin tuaj | Ndertimnet
        </title>
        <meta
          name="description"
          content="Përshkruani projektin, merrni oferta dhe krahasoni kompanitë në Kosovë dhe Shqipëri."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:locale" content="sq_AL" />
        <meta property="og:site_name" content="Ndertimnet" />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Gjeni kompaninë për projektin tuaj | Ndertimnet"
        />
        <meta
          property="og:description"
          content="Përshkruani projektin, merrni oferta dhe krahasoni kompanitë në Kosovë dhe Shqipëri."
        />
        <meta property="og:image" content="https://ndertimnet.com/og-image.jpg" />
        <meta
          property="og:image:alt"
          content="Ndertimnet platform për ndërtim dhe renovim"
        />
        <meta property="og:url" content="https://ndertimnet.com/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Gjeni kompaninë për projektin tuaj | Ndertimnet" />
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
        {isNativeApp ? <>
        <section aria-labelledby="welcome-title" className="bg-[#f7f4ee]">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-8">
            <div className="max-w-2xl">
              <h1 id="welcome-title" className="max-w-[22ch] text-[26px] font-semibold leading-[1.2] tracking-tight text-[#12251b] sm:text-[32px]">
                {defaultHero.title}
              </h1>
            </div>
            <div className="mt-4 lg:mt-0 lg:shrink-0">
              <div className="flex [&>a]:w-full sm:[&>a]:w-auto">
                <PrimaryButton to="/nis-projektin">Fillo projektin këtu</PrimaryButton>
              </div>
              {!heroAdvertisement && <button ref={exampleTriggerRef} type="button" onClick={() => setExampleOpen(true)} aria-haspopup="dialog" aria-controls={exampleOpen ? "campaign-example" : undefined} className="mt-1 inline-flex min-h-[44px] items-center gap-1 text-xs text-[#5f6f66] underline underline-offset-4">
                A jeni kompani?<ArrowRight size={13} aria-hidden="true" />
              </button>}
            </div>
          </div>
        </section>
        {heroAdvertisement && <SponsoredHeroAdvertisement advertisement={heroAdvertisement} />}
        {exampleOpen && <CampaignExampleDialog onClose={() => setExampleOpen(false)} returnFocusRef={exampleTriggerRef} />}

        </> : <WebsiteLandingHero advertisement={heroAdvertisement} />}

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
                  to="/nis-projektin"
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
              <p className="mb-3 text-xs text-gray-600">Shembull demonstrues — shifrat nuk janë të dhëna reale.</p>
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

        <div className="premium-container py-12"><PublicSubscriptionPricing /></div>
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
              <PrimaryButton to="/nis-projektin">Fillo projektin</PrimaryButton>
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
