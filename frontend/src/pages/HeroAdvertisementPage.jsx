import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import api from "../api/axios";

function renderBody(body) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return null;
  }

  return blocks.map((block, index) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const isList = lines.every((line) => line.startsWith("- "));

    if (isList) {
      return (
        <ul key={index} className="space-y-2 pl-5">
          {lines.map((line) => (
            <li key={line} className="list-disc">
              {line.replace(/^- /, "")}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={index} className="leading-8">
        {lines.join(" ")}
      </p>
    );
  });
}

export default function HeroAdvertisementPage() {
  const { slug } = useParams();
  const [advertisement, setAdvertisement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAdvertisement = async () => {
      try {
        const response = await api.get(`reklama/${slug}/`, { skipAuth: true });

        if (!isMounted) {
          return;
        }

        setAdvertisement(response.data);
        setError("");
      } catch (err) {
        if (isMounted) {
          setError("Kjo reklamë nuk mund të ngarkohet për momentin.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAdvertisement();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return (
    <>
      <Helmet>
        <html lang="sq" />
        <title>
          {advertisement
            ? `${advertisement.title} | Ndertimnet`
            : "Reklamë | Ndertimnet"}
        </title>
        <meta
          name="description"
          content={
            advertisement?.subtitle ||
            "Lexo më shumë rreth reklamave dhe ofertave në Ndertimnet."
          }
        />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <main className="bg-white text-[#12251b]">
        {loading && (
          <div className="mx-auto max-w-3xl px-6 py-20">
            <div className="rounded-lg border border-[#e5e0d5] bg-[#f7f4ee] p-5 text-[#5f6f66]">
              Duke ngarkuar reklamën...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto max-w-3xl px-6 py-20">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#17643f] hover:underline"
            >
              <ArrowLeft size={16} />
              Kthehu në faqen kryesore
            </Link>
            <div className="mt-8 rounded-lg border border-red-100 bg-red-50 p-5 text-red-700">
              {error}
            </div>
          </div>
        )}

        {!loading && !error && advertisement && (
          <>
            <section className="relative overflow-hidden bg-[#12251b]">
              <img
                src={advertisement.background_image_url}
                alt={advertisement.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[#12251b]/70" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#12251b]/85" />

              <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  <ArrowLeft size={16} />
                  Faqja kryesore
                </Link>

                <h1 className="mt-8 max-w-4xl text-[36px] font-semibold leading-[1.06] text-white sm:text-[58px]">
                  {advertisement.title}
                </h1>

                {advertisement.subtitle && (
                  <p className="mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
                    {advertisement.subtitle}
                  </p>
                )}
              </div>
            </section>

            <section className="py-16 sm:py-20">
              <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                {advertisement.sections?.length ? (
                  <div className="space-y-8">
                    {advertisement.sections.slice(0, 5).map((section) => (
                      <article
                        key={section.id}
                        className="rounded-lg border border-[#e5e0d5] bg-white p-6 shadow-sm"
                      >
                        {section.title && (
                          <h2 className="text-2xl font-semibold text-[#12251b]">
                            {section.title}
                          </h2>
                        )}
                        <div className="mt-4 space-y-4 text-[#5f6f66]">
                          {renderBody(section.body)}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#e5e0d5] bg-[#f7f4ee] p-6 text-[#5f6f66]">
                    Më shumë informacion do të publikohet së shpejti.
                  </div>
                )}

                {advertisement.link_type === "external" && advertisement.external_url && (
                  <a
                    href={advertisement.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-10 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#ef7d22] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d96814]"
                  >
                    Vizito linkun
                    <ArrowRight size={17} />
                  </a>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
