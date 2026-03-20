// ===========================================
// src/pages/AboutPage.jsx
// Ndertimnet – About Page (V3 SEO + Premium)
// ===========================================

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  Briefcase,
  SearchCheck,
  Target,
  ArrowRight,
  Sparkles,
  BadgeCheck,
  Hammer,
  HelpCircle,
  Globe,
  Star,
  ClipboardList,
} from "lucide-react";

export default function AboutPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "A është Ndertimnet falas për klientët?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Po, klientët mund të publikojnë projektin dhe të marrin oferta nga kompani relevante përmes platformës.",
        },
      },
      {
        "@type": "Question",
        name: "Në cilat tregje operon Ndertimnet?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ndertimnet është ndërtuar për tregun e ndërtimit dhe renovimit në Kosovë dhe Shqipëri.",
        },
      },
      {
        "@type": "Question",
        name: "Çfarë vlere sjell Ndertimnet për kompanitë?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Platforma u jep kompanive një mënyrë më moderne dhe më të strukturuar për të arritur klientë të rinj, për të prezantuar shërbimet dhe për të ndërtuar reputacionin e tyre profesional online.",
        },
      },
      {
        "@type": "Question",
        name: "Si e ndihmon Ndertimnet klientin të zgjedhë më mirë?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ndertimnet synon të krijojë më shumë transparencë, më shumë strukturë dhe më shumë besim në procesin e publikimit të projekteve dhe marrjes së ofertave.",
        },
      },
    ],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ndertimnet",
    url: "https://ndertimnet.com",
    logo: "https://ndertimnet.com/logo192.png",
    description:
      "Ndertimnet është platforma që lidh klientët me kompani të ndërtimit dhe renovimit në Kosovë dhe Shqipëri.",
    areaServed: ["Kosovo", "Albania"],
  };

  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Rreth Nesh | Ndertimnet",
    url: "https://ndertimnet.com/about",
    description:
      "Mëso më shumë për Ndertimnet, platformën që synon të sjellë më shumë transparencë, cilësi dhe besim në tregun e ndërtimit dhe renovimit në Kosovë dhe Shqipëri.",
    isPartOf: {
      "@type": "WebSite",
      name: "Ndertimnet",
      url: "https://ndertimnet.com",
    },
    about: {
      "@type": "Organization",
      name: "Ndertimnet",
    },
  };

  return (
    <>
      <Helmet>
        <html lang="sq" />
        <title>Rreth Nesh | Ndertimnet</title>
        <meta name="author" content="Ndertimnet" />
        <meta property="og:image:alt" content="Ndertimnet platformë ndërtimi dhe renovimi" />

        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta
          name="description"
          content="Mëso më shumë për Ndertimnet – platforma që lidh klientët me kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri me fokus në transparencë, cilësi dhe besim."
        />
        <meta
          name="keywords"
          content="rreth nesh, Ndertimnet, kompani ndërtimi, renovim, Kosovë, Shqipëri, platformë ndërtimi, platformë renovimi, kompani serioze ndërtimi, oferta ndërtimi"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ndertimnet.com/about" />

        <meta property="og:type" content="website" />
        <meta property="og:locale" content="sq_AL" />
        <meta property="og:site_name" content="Ndertimnet" />
        <meta property="og:title" content="Rreth Nesh | Ndertimnet" />
        <meta
          property="og:description"
          content="Ndertimnet synon të transformojë tregun e ndërtimit dhe renovimit në Kosovë dhe Shqipëri përmes një platforme më moderne, më të qartë dhe më profesionale."
        />
        <meta property="og:url" content="https://ndertimnet.com/about" />
        <meta
          property="og:image"
          content="https://ndertimnet.com/og-image.jpg"
        />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rreth Nesh | Ndertimnet" />
        <meta
          name="twitter:description"
          content="Platforma që lidh klientët me kompani ndërtimi dhe renovimi në Kosovë dhe Shqipëri."
        />
        <meta
          name="twitter:image"
          content="https://ndertimnet.com/og-image.jpg"
        />

        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(aboutPageSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <main className="bg-white text-slate-900">
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-sky-100/50 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-slate-100/60 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-8 lg:px-10 lg:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-2">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  Platformë moderne për ndërtim dhe renovim
                </div>

                <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
                  Po ndërtojmë një mënyrë më të mirë për të lidhur klientët me
                  kompanitë e duhura.
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                  Ndertimnet është krijuar për të sjellë më shumë transparencë,
                  më shumë profesionalizëm dhe më shumë besim në tregun e
                  ndërtimit dhe renovimit në Kosovë dhe Shqipëri.
                </p>

                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Ne besojmë se zgjedhja e kompanisë së duhur nuk duhet të jetë
                  e paqartë, e lodhshme apo e pasigurt. Po krijojmë një
                  platformë ku klientët mund të nisin projektet e tyre me më
                  shumë qartësi, ndërsa kompanitë serioze mund të fitojnë më
                  shumë mundësi reale.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/jobrequests/create"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Publiko projektin
                  </Link>

                  <Link
                    to="/register/company"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Regjistro kompaninë
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-950">
                      Transparencë
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Proces më i qartë nga publikimi i projektit deri te
                      përzgjedhja e kompanisë.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-950">
                      Profesionalizëm
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Platformë e ndërtuar për bashkëpunime më serioze dhe më të
                      strukturuara.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-950">
                      Besim
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Fokus te një treg më i sigurt për klientët dhe më i fortë
                      për kompanitë.
                    </p>
                  </div>
                </div>
              </div>

              {/* Premium visual layout */}
              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                    <ShieldCheck className="h-10 w-10 text-blue-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">
                      Më shumë besim
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Synojmë të krijojmë një ambient më të besueshëm për
                      klientët që kërkojnë partnerin e duhur për projektin e
                      tyre.
                    </p>
                  </div>

                  <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                    <ClipboardList className="h-10 w-10 text-blue-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">
                      Më shumë strukturë
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Një proces më i organizuar për publikimin e kërkesës,
                      marrjen e ofertave dhe krahasimin e alternativave.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                    <Building2 className="h-10 w-10 text-blue-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">
                      Më shumë mundësi
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Kompanitë serioze fitojnë një kanal modern për të arritur
                      klientë të rinj dhe për të ndërtuar reputacion.
                    </p>
                  </div>

                  <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                    <Target className="h-10 w-10 text-blue-700" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">
                      Standard më i lartë
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Ambicia jonë është të ndihmojmë në krijimin e një tregu më
                      modern, më transparent dhe më profesional.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= WHY WE EXIST ================= */}
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              <Hammer className="h-4 w-4" />
              Pse ekziston Ndertimnet
            </div>

            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Sepse tregu ka nevojë për më shumë qartësi
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Në ndërtim dhe renovim, klientët shpesh përballen me pasiguri,
              mungesë informacioni dhe vështirësi për të gjetur partnerin e
              duhur. Nga ana tjetër, shumë kompani profesionale nuk kanë një
              mënyrë moderne dhe të strukturuar për të arritur klientët e duhur.
            </p>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              Ndertimnet u krijua për të ndërtuar urën mes këtyre dy palëve —
              me më shumë rend, më shumë transparencë dhe më shumë vlerë reale
              për të gjithë ekosistemin.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <SearchCheck className="h-10 w-10 text-blue-700" />
              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                Gjetja e kompanisë së duhur është shpesh e vështirë
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Klientët shpesh nuk dinë ku të fillojnë, kujt t’i besojnë dhe si
                të krahasojnë alternativat në mënyrë profesionale.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Briefcase className="h-10 w-10 text-blue-700" />
              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                Procesi shpesh është i fragmentuar dhe i paqartë
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Informacion i shpërndarë, komunikim jo i strukturuar dhe oferta
                që shpesh nuk krahasohen lehtë.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Users className="h-10 w-10 text-blue-700" />
              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                Kompanitë serioze meritojnë një prezencë më të fortë
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Bizneset profesionale kanë nevojë për një kanal më modern për të
                fituar projekte, për të ndërtuar besueshmëri dhe për t’u
                dalluar.
              </p>
            </div>
          </div>
        </section>

        {/* ================= OUR SOLUTION ================= */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  Qëllimi ynë është i qartë:
                  <span className="block text-blue-700">
                    të sjellim më shumë transparencë dhe më shumë cilësi në treg.
                  </span>
                </h2>

                <p className="mt-6 text-lg leading-8 text-slate-600">
                  Ndertimnet është ndërtuar për të thjeshtuar dhe përmirësuar
                  mënyrën se si klientët dhe kompanitë lidhen me njëri-tjetrin.
                  Ne nuk synojmë vetëm më shumë kontakte, por lidhje më të mira,
                  më të besueshme dhe më të orientuara drejt rezultateve.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    "Proces më i strukturuar për publikimin e projekteve",
                    "Mundësi për të marrë dhe krahasuar oferta në mënyrë më të qartë",
                    "Hapësirë më profesionale për kompanitë serioze",
                    "Më shumë besim në vendimmarrjen e klientit",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
                      <p className="text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg">
                <h3 className="text-2xl font-semibold text-slate-950">
                  Vlerat mbi të cilat po ndërtojmë platformën
                </h3>

                <div className="mt-8 grid gap-5">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-5 w-5 text-blue-700" />
                      <span className="font-semibold text-slate-950">
                        Transparencë
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Më shumë qartësi rreth projektit, ofertave dhe rrugës drejt
                      bashkëpunimit.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-5 w-5 text-blue-700" />
                      <span className="font-semibold text-slate-950">
                        Profesionalizëm
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Një ambient më serioz për prezantim, komunikim dhe ndërtim
                      të marrëdhënieve afatgjata.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-5 w-5 text-blue-700" />
                      <span className="font-semibold text-slate-950">
                        Besueshmëri
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Një treg më i fortë krijohet kur klientët ndihen më të
                      sigurt dhe kompanitë serioze dallohen më qartë.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-5 w-5 text-blue-700" />
                      <span className="font-semibold text-slate-950">
                        Rritje afatgjatë
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Po ndërtojmë diçka me vizion afatgjatë, jo thjesht një faqe
                      listimesh.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Si funksionon
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Procesi është krijuar për të qenë i thjeshtë për përdoruesin, por
              i fortë në logjikë dhe vlerë.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white">
                1
              </div>
              <h3 className="text-xl font-semibold text-slate-950">
                Publiko projektin
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Klienti përshkruan nevojën, llojin e punës dhe detajet kryesore
                të projektit.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white">
                2
              </div>
              <h3 className="text-xl font-semibold text-slate-950">
                Merr oferta
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Kompanitë relevante mund të paraqesin interes dhe të dërgojnë
                ofertat e tyre.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white">
                3
              </div>
              <h3 className="text-xl font-semibold text-slate-950">
                Zgjidh me më shumë siguri
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                Klienti krahason alternativat dhe merr një vendim më të informuar
                për bashkëpunimin e duhur.
              </p>
            </div>
          </div>
        </section>

        {/* ================= TRUST / AUTHORITY ================= */}
        <section className="border-y border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">
                  <Star className="h-4 w-4 text-blue-300" />
                  Trust layer
                </div>

                <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
                  Besimi nuk është vetëm pjesë e platformës —
                  <span className="block text-blue-300">
                    është themeli i saj.
                  </span>
                </h2>

                <p className="mt-6 text-lg leading-8 text-slate-300">
                  Në një industri ku projektet kanë peshë reale dhe vendimet
                  ndikojnë drejtpërdrejt në kohë, kosto dhe rezultat, besimi
                  duhet të jetë pjesë e strukturës së vetë platformës.
                </p>

                <p className="mt-4 text-lg leading-8 text-slate-300">
                  Kjo është arsyeja pse Ndertimnet ndërtohet me fokus të qartë
                  te serioziteti, qartësia dhe profesionalizmi.
                </p>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    title: "Fokus te kompani serioze",
                    text: "Synimi ynë është të krijojmë një ambient ku cilësia, prezenca profesionale dhe besueshmëria kanë më shumë peshë.",
                  },
                  {
                    title: "Profile më të qarta",
                    text: "Një prezantim më i fortë ndihmon klientët të kuptojnë më mirë alternativat dhe të zgjedhin më me siguri.",
                  },
                  {
                    title: "Platformë moderne dhe neutrale",
                    text: "Ne ndërtojmë një ambient ku lidhja mes klientit dhe kompanisë ndodh në mënyrë më profesionale dhe më të strukturuar.",
                  },
                  {
                    title: "Ambicie për të ngritur standardin",
                    text: "Nuk duam vetëm të lehtësojmë procesin, por të kontribuojmë në përmirësimin e vetë tregut.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-blue-300" />
                      <div>
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 leading-7 text-slate-300">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= MARKET / REGION ================= */}
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                <Globe className="h-4 w-4" />
                Kosovë dhe Shqipëri
              </div>

              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Ndërtuar për rajonin, me vizion afatgjatë
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Ndertimnet është menduar për nevojat reale të tregut në Kosovë
                dhe Shqipëri. Platforma jonë fokusohet në krijimin e një
                experience më moderne për klientët dhe një prani më të fortë
                digjitale për kompanitë që duan të rriten.
              </p>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                Qëllimi ynë është të ndërtojmë një platformë referuese për
                ndërtim dhe renovim në rajon — një emër që lidhet me cilësi,
                qartësi dhe besueshmëri.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-950">
                  Për klientët
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Më shumë qartësi, më shumë siguri dhe një proces më i thjeshtë
                  për të gjetur kompaninë e duhur.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-950">
                  Për kompanitë
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Një mënyrë më moderne për të fituar mundësi të reja dhe për të
                  ndërtuar reputacionin online.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-950">
                  Për tregun
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Një hap drejt më shumë profesionalizmi, strukturë dhe
                  transparencë në industri.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-950">
                  Për të ardhmen
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Një platformë me ambicie afatgjatë dhe potencial për t’u bërë
                  standardi i ri në rajon.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= VISION ================= */}
        <section className="mx-auto max-w-7xl px-6 py-20 md:px-8 lg:px-10">
          <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-10 shadow-sm md:p-14">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <Target className="h-4 w-4 text-blue-700" />
                Vizioni ynë
              </div>

              <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Ne nuk po ndërtojmë vetëm një platformë.
                <span className="block text-blue-700">
                  Ne po ndërtojmë standardin e ri për industrinë.
                </span>
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600 md:text-xl">
                Ambicia jonë është të krijojmë një ekosistem më të fortë për
                ndërtim dhe renovim në rajon — ku klientët ndihen më të sigurt,
                kompanitë serioze fitojnë më shumë mundësi dhe tregu bëhet më
                transparent, më modern dhe më profesional.
              </p>

              <p className="mt-4 text-lg leading-8 text-slate-600 md:text-xl">
                Ndertimnet ndërtohet me vizion afatgjatë: të bëhet pika
                referuese për ata që kërkojnë cilësi, besueshmëri dhe rezultate.
              </p>
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-4xl px-6 py-20 md:px-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <HelpCircle className="h-4 w-4 text-blue-700" />
                FAQ
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Pyetje të shpeshta
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Disa nga pyetjet më të zakonshme rreth Ndertimnet.
              </p>
            </div>

            <div className="mt-12 space-y-5">
              {[
                {
                  q: "A është Ndertimnet falas për klientët?",
                  a: "Po, klientët mund të publikojnë projektin dhe të marrin oferta nga kompani relevante përmes platformës.",
                },
                {
                  q: "Në cilat tregje operon Ndertimnet?",
                  a: "Ndertimnet është ndërtuar për tregun e ndërtimit dhe renovimit në Kosovë dhe Shqipëri.",
                },
                {
                  q: "Çfarë vlere sjell Ndertimnet për kompanitë?",
                  a: "Platforma u jep kompanive një mënyrë më moderne dhe më të strukturuar për të arritur klientë të rinj, për të prezantuar shërbimet e tyre dhe për të ndërtuar reputacion profesional online.",
                },
                {
                  q: "Si e ndihmon Ndertimnet klientin të zgjedhë më mirë?",
                  a: "Ndertimnet synon të krijojë më shumë transparencë, më shumë strukturë dhe më shumë besim në procesin e publikimit të projekteve dhe marrjes së ofertave.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-950">
                    {item.q}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= FINAL CTA ================= */}
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 md:px-8 lg:px-10">
            <div className="rounded-[2rem] bg-slate-950 px-8 py-12 text-white shadow-xl md:px-12 md:py-16">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                    Gati për të filluar?
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                    Nëse je klient, publiko projektin tënd dhe merr oferta. Nëse
                    je kompani, krijo prezencën tënde dhe lidhu me mundësi të
                    reja biznesi. Nëse ke ende pyetje ose mendime shiqo faqën {" "}
                    <Link
                      to="/contact"
                      className="font-medium underline hover:no-underline"
                    >
                     kontakt
                    </Link>
                    .
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
                  <Link
                    to="/jobrequests/create"
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  >
                    Publiko projektin
                  </Link>

                  <Link
                    to="/register/company"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    Regjistro kompaninë
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}