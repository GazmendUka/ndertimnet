// src/pages/seo/services/RenovimBanjoPage.jsx

import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Bath,
  CheckCircle2,
  Hammer,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Wrench,
  Building2,
  ClipboardList,
  HelpCircle,
} from "lucide-react";

import PublicLayout from "../../../components/layouts/PublicLayout";

export default function RenovimBanjoPage() {
  return (
    <PublicLayout>
      <Helmet>
        <html lang="sq" />

        <title>Renovim banjo në Shqipëri dhe Kosovë | Ndertimnet</title>

        <meta
          name="description"
          content="Gjej kompani për renovim banjo në Shqipëri dhe Kosovë. Publiko projektin tënd, krahaso oferta dhe lidhu me profesionistë për pllaka, hidraulikë, instalime dhe rifinitura."
        />

        <meta
          name="keywords"
          content="renovim banjo, renovime banjo, kompani renovim banjo, banjo moderne, pllaka banjo, hidraulik banjo, instalime banjo, rinovim banjo Shqipëri, rinovim banjo Kosovë"
        />

        <meta name="robots" content="index, follow" />
        <meta name="author" content="Ndertimnet" />
        <meta name="theme-color" content="#ffffff" />

        <link rel="canonical" href="https://ndertimnet.com/renovim-banjo" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="Renovim banjo në Shqipëri dhe Kosovë | Ndertimnet"
        />
        <meta
          property="og:description"
          content="Publiko projektin tënd dhe gjej kompani për renovim banjo. Krahaso oferta për pllaka, hidraulikë, instalime dhe punime të plota."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ndertimnet.com/renovim-banjo" />
        <meta property="og:site_name" content="Ndertimnet" />
        <meta property="og:locale" content="sq_AL" />

        {/* Twitter */}
        <meta
          name="twitter:title"
          content="Renovim banjo në Shqipëri dhe Kosovë | Ndertimnet"
        />
        <meta
          name="twitter:description"
          content="Gjej kompani për renovim banjo dhe merr oferta nga profesionistë të verifikuar."
        />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Structured Data - WebPage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Renovim banjo në Shqipëri dhe Kosovë | Ndertimnet",
            url: "https://ndertimnet.com/renovim-banjo",
            description:
              "Gjej kompani për renovim banjo në Shqipëri dhe Kosovë. Publiko projektin tënd dhe merr oferta nga profesionistë për instalime, pllaka dhe rifinitura.",
            inLanguage: "sq",
            isPartOf: {
              "@type": "WebSite",
              name: "Ndertimnet",
              url: "https://ndertimnet.com",
            },
          })}
        </script>

        {/* Structured Data - FAQ */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Sa kushton renovimi i banjos?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Kostoja e renovimit të banjos varet nga madhësia, gjendja ekzistuese, materialet e përzgjedhura dhe niveli i punimeve. Punimet bazë kushtojnë më pak se një transformim i plotë me instalime të reja, pllaka cilësore dhe pajisje sanitare moderne.",
                },
              },
              {
                "@type": "Question",
                name: "Çfarë përfshin zakonisht një renovim banjo?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Një renovim banjo zakonisht përfshin prishjen e elementeve ekzistuese, punimet hidraulike, instalimet elektrike, hidroizolimin, vendosjen e pllakave, montimin e pajisjeve sanitare dhe rifiniturat përfundimtare.",
                },
              },
              {
                "@type": "Question",
                name: "Sa zgjat renovimi i banjos?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Në varësi të kompleksitetit, një renovim banjo mund të zgjasë nga disa ditë deri në disa javë. Një banjo me punime të plota, instalime të reja dhe materiale të personalizuara zakonisht kërkon më shumë kohë.",
                },
              },
              {
                "@type": "Question",
                name: "Si ndihmon Ndertimnet për të gjetur kompaninë e duhur?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Ndertimnet të ndihmon të publikosh projektin, të përshkruash nevojat e tua dhe të lidhesh me kompani të ndërtimit dhe renovimit që ofrojnë shërbime relevante. Kjo e bën më të lehtë krahasimin e alternativave dhe gjetjen e partnerit të duhur.",
                },
              },
            ],
          })}
        </script>

        {/* Structured Data - Service */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Renovim banjo",
            serviceType: "Renovim i plotë ose i pjesshëm i banjos",
            provider: {
              "@type": "Organization",
              name: "Ndertimnet",
              url: "https://ndertimnet.com",
            },
            areaServed: ["Albania", "Kosovo"],
            description:
              "Platformë për të gjetur kompani dhe profesionistë për renovim banjo, instalime, pllaka, hidroizolim dhe rifinitura.",
          })}
        </script>
      </Helmet>

      <main className="bg-white text-slate-900">
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
                  <Bath className="h-4 w-4" />
                  Shërbim premium për renovim banjo
                </div>

                <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Renovim banjo në Shqipëri dhe Kosovë
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Gjetja e kompanisë së duhur për{" "}
                  <strong>renovim banjo</strong> kërkon kohë, kujdes dhe besim.
                  Në Ndertimnet mund të publikosh projektin tënd, të
                  prezantosh nevojat që ke dhe të lidhehesh me profesionistë që
                  ofrojnë punime për banjo moderne, funksionale dhe të
                  realizuara me standard.
                </p>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  Qoftë për një banjo të vogël, një transformim të plotë,
                  zëvendësim pllakash, punime hidraulike apo rifinitura elegante,
                  kjo faqe të jep një pamje të qartë mbi shërbimin, procesin dhe
                  mënyrën si Ndertimnet të ndihmon të gjesh zgjidhjen e duhur.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/register/customer"
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Publiko projektin
                  </Link>

                  <Link
                    to="/companies"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    Gjej kompani
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-600">
                  <div className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Fokus te cilësia
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Për banjo moderne
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Hammer className="h-4 w-4" />
                    Punime të plota ose të pjesshme
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <ClipboardList className="h-6 w-6 text-slate-800" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Çfarë përfiton nga kjo faqe?
                    </h2>
                    <p className="mt-2 text-slate-600">
                      Një përmbledhje e qartë për renovimin e banjos, çfarë
                      përfshin ky shërbim, kur duhet ta konsiderosh dhe si të
                      gjesh profesionistët e duhur për projektin tënd.
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {[
                    "Kupton çfarë përfshin një renovim banjo",
                    "Mëson kur është momenti i duhur për rinovim",
                    "Zbulon çfarë punimesh kërkohen më shpesh",
                    "Lidhet me kompani dhe profesionistë relevantë",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-slate-800" />
                      <span className="text-sm text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= INTRO / BODY ================= */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Çfarë është renovimi i banjos?
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-700">
              <strong>Renovimi i banjos</strong> është një nga investimet më të
              rëndësishme në një banesë apo objekt. Banja është një hapësirë që
              përdoret çdo ditë dhe që duhet të kombinojë funksionalitetin,
              higjienën, qëndrueshmërinë dhe estetikën. Me kalimin e kohës,
              materialet konsumohen, instalimet vjetërohen dhe kërkesat për
              komoditet ndryshojnë. Pikërisht për këtë arsye, shumë prona kalojnë
              në një fazë ku renovimi i banjos bëhet i domosdoshëm.
            </p>

            <p className="mt-6 text-lg leading-8 text-slate-700">
              Një projekt i mirë i renovimit nuk lidhet vetëm me pamjen finale.
              Ai përfshin planifikim, zgjedhje të sakta materialesh, punime të
              kontrolluara dhe koordinim midis zanateve të ndryshme. Në varësi të
              gjendjes ekzistuese, renovimi mund të jetë i pjesshëm ose i plotë.
              Në disa raste mjafton ndërrimi i pllakave, i elementeve sanitare
              ose i mobilimit. Në raste të tjera kërkohet ndërhyrje më e thellë,
              si prishje, hidroizolim i ri, instalime hidraulike dhe elektrike,
              si dhe ridizenjim i të gjithë ambientit.
            </p>

            <p className="mt-6 text-lg leading-8 text-slate-700">
              Përmes Ndertimnet, qëllimi është që përdoruesit të kuptojnë më
              qartë çfarë kërkon një renovim banjo dhe të kenë një pikë hyrëse
              më profesionale për të gjetur kompani ose profesionistë që mund ta
              realizojnë projektin në mënyrë serioze. Kjo faqe është ndërtuar si
              një burim informues dhe SEO, por edhe si një urë lidhëse drejt
              platformës.
            </p>
          </div>
        </section>

        {/* ================= WHAT IS INCLUDED ================= */}
        <section className="border-y bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Çfarë përfshin zakonisht renovimi i banjos?
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                Çdo projekt është i ndryshëm, por në shumicën e rasteve renovimi
                i banjos përfshin disa ose të gjitha elementet e mëposhtme.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  icon: Hammer,
                  title: "Prishje dhe përgatitje",
                  text: "Heqja e pllakave të vjetra, elementeve sanitare ekzistuese dhe përgatitja e sipërfaqeve për fazat e reja të punës.",
                },
                {
                  icon: Wrench,
                  title: "Punime hidraulike",
                  text: "Riorganizimi ose zëvendësimi i tubacioneve, daljeve të ujit, shkarkimeve dhe elementeve të kanalizimit sipas projektit.",
                },
                {
                  icon: Building2,
                  title: "Instalime elektrike",
                  text: "Përshtatja e ndriçimit, pikave elektrike, ventilimit dhe elementeve të sigurisë për një ambient të lagësht.",
                },
                {
                  icon: ShieldCheck,
                  title: "Hidroizolim",
                  text: "Aplikimi i shtresave mbrojtëse kundër depërtimit të ujit, një nga hapat më kritikë për jetëgjatësinë e banjos.",
                },
                {
                  icon: Bath,
                  title: "Pllaka dhe pajisje sanitare",
                  text: "Vendosja e pllakave të reja, montimi i lavamanit, dushit, vaskës, WC-së dhe elementeve të tjera funksionale.",
                },
                {
                  icon: Sparkles,
                  title: "Rifinitura përfundimtare",
                  text: "Mbyllja e detajeve, fugat, aksesorët, mobilimi dhe përmirësimet estetike që e bëjnë banjon të kompletuar.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="inline-flex rounded-2xl bg-slate-100 p-3">
                      <Icon className="h-6 w-6 text-slate-900" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= WHEN YOU NEED IT ================= */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Kur ke nevojë për renovim banjo?
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-700">
                Nevoja për renovim mund të vijë nga probleme teknike, konsumimi i
                materialeve ose thjesht dëshira për një standard më të lartë.
                Shumë pronarë e shtyjnë këtë investim derisa defektet bëhen të
                dukshme, por në realitet renovimi i planifikuar shpesh kursen
                kohë, stres dhe kosto afatgjata.
              </p>

              <p className="mt-6 text-lg leading-8 text-slate-700">
                Nëse banja ka rrjedhje, lagështi, plasaritje, ventilim të dobët,
                pajisje të vjetruara ose një pamje që nuk përputhet më me
                standardin e objektit, atëherë ka shumë gjasa që është momenti i
                duhur për të konsideruar një rinovim. Po ashtu, në rastet e
                blerjes së një banese të vjetër apo përgatitjes së saj për shitje
                ose qira, renovimi i banjos është shpesh një nga investimet me
                ndikimin më të lartë.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
              <h3 className="text-xl font-semibold text-slate-900">
                Shenja tipike që tregojnë se banja ka nevojë për rinovim
              </h3>

              <div className="mt-6 space-y-4">
                {[
                  "Pllaka të dëmtuara, të vjetra ose me fuga të konsumuar",
                  "Probleme me lagështinë, mykun ose depërtimin e ujit",
                  "Instalime hidraulike të amortizuara ose joefikase",
                  "Pajisje sanitare të vjetruara ose jo funksionale",
                  "Hapësirë jo praktike dhe organizim i dobët",
                  "Nevojë për pamje më moderne dhe më të pastër",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-slate-900" />
                    <p className="text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= WHY NDERTIMNET ================= */}
        <section className="border-y bg-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Pse ta përdorësh Ndertimnet për renovim banjo?
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                Kur kërkon kompani për një projekt të tillë, sfida më e madhe
                zakonisht nuk është vetëm të gjesh dikë që punon, por të gjesh
                një partner që kupton nevojën, ofron seriozitet dhe e trajton
                projektin me kujdes. Ndertimnet është ndërtuar pikërisht për ta
                bërë këtë proces më të qartë dhe më efikas.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Krahasim më i lehtë",
                  text: "Përdoruesi mund të publikojë projektin dhe të ketë një hyrje më të strukturuar në treg.",
                },
                {
                  title: "Fokus te relevanca",
                  text: "Platforma është e orientuar drejt sektorit të ndërtimit dhe renovimit, jo një listim i përgjithshëm pa kontekst.",
                },
                {
                  title: "Më shumë qartësi",
                  text: "Ndihmon në përshkrimin e punimeve dhe në përcaktimin më të qartë të asaj që kërkohet.",
                },
                {
                  title: "Më pak humbje kohe",
                  text: "Në vend që të kërkosh në shumë vende, e ke më të lehtë të nisesh nga një pikë qendrore.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= RELATED SERVICES ================= */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 md:p-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Shërbime të tjera
            </h2>

            <p className="mt-3 max-w-3xl text-slate-600">
              Në shumë raste, renovimi i banjos lidhet edhe me punime të tjera në
              banesë apo objekt. Shiko edhe këto faqe për shërbime të ngjashme
              dhe relevante.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 text-sm">
              <Link
                to="/ndertime"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Ndërtim <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/renovime"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Renovime <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/renovim-kuzhine"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Renovim kuzhine <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/elektricist"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Elektricist <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/lyerje"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Lyerje <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/fasada"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Fasada <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/cati"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Çati <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/pllakashtrues"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Pllakashtrues <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/dysheme"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Dysheme <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section className="border-t bg-white">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-6 w-6 text-slate-900" />
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Pyetje të shpeshta për renovim banjo
              </h2>
            </div>

            <div className="mt-10 space-y-6">
              {[
                {
                  q: "Sa kushton renovimi i banjos?",
                  a: "Kostoja ndryshon sipas madhësisë së banjos, gjendjes aktuale, nivelit të punimeve dhe materialeve që zgjidhen. Një rifreskim bazë kushton më pak se një renovim i plotë me instalime të reja, hidroizolim dhe pajisje sanitare premium.",
                },
                {
                  q: "Çfarë përfshin zakonisht një renovim banjo?",
                  a: "Në shumicën e rasteve përfshin prishje, përgatitje të sipërfaqeve, punime hidraulike, instalime elektrike, hidroizolim, vendosje pllakash, montim pajisjesh sanitare dhe rifinitura përfundimtare.",
                },
                {
                  q: "Sa zgjat një projekt i tillë?",
                  a: "Kohëzgjatja varet nga kompleksiteti. Një ndërhyrje e thjeshtë mund të përfundojë më shpejt, ndërsa një renovim i plotë me riorganizim të elementeve dhe shumë procese teknike kërkon më shumë kohë dhe koordinim.",
                },
                {
                  q: "A ia vlen të renovosh banjon para shitjes ose dhënies me qira të pronës?",
                  a: "Po, në shumë raste renovimi i banjos rrit ndjeshëm perceptimin e pronës, standardin e saj dhe interesin nga blerësit ose qiramarrësit. Është një nga investimet me ndikim të lartë vizual dhe praktik.",
                },
                {
                  q: "Si më ndihmon Ndertimnet?",
                  a: "Ndertimnet të ndihmon të paraqesësh më qartë projektin tënd dhe të gjesh kompani ose profesionistë relevantë për punime ndërtimi dhe renovimi. Kjo e bën procesin më të strukturuar dhe më efikas.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {item.q}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-700">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= BOTTOM CTA ================= */}
        <section className="border-t bg-slate-900">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Gati për të nisur projektin e renovimit të banjos?
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-300">
                Nëse po planifikon një banjo të re, dëshiron të përmirësosh
                standardin e shtëpisë ose ke nevojë për profesionistë për një
                renovim serioz, Ndertimnet është pika e duhur për të filluar.
                Publiko projektin ose eksploro kompanitë që ofrojnë shërbime në
                fushën e ndërtimit dhe renovimit.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/register/customer"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Publiko projektin
                </Link>

                <Link
                  to="/companies"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Gjej kompani
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}