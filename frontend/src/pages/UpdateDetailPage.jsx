import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";

const statusLabels = {
  in_progress: "Në zhvillim",
  planned: "Në plan",
  done: "Të publikuara",
};

export default function UpdateDetailPage() {
  const { slug } = useParams();
  const [update, setUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadUpdate = async () => {
      try {
        const response = await api.get(`updates/${slug}/`, { skipAuth: true });

        if (!isMounted) {
          return;
        }

        setUpdate(response.data);
        setError("");
      } catch (err) {
        if (isMounted) {
          setError("Ky përditësim nuk mund të ngarkohet për momentin.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUpdate();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const paragraphs = update?.body
    ? update.body.split(/\n{2,}/).filter(Boolean)
    : [];

  return (
    <>
      <Helmet>
        <html lang="sq" />
        <title>
          {update ? `${update.title} | Ndertimnet` : "Përditësim | Ndertimnet"}
        </title>
        <meta
          name="description"
          content={update?.summary || "Lexo më shumë rreth përditësimeve të Ndertimnet."}
        />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="bg-white text-gray-900">
        <main className="max-w-3xl mx-auto px-6 py-16 md:py-20">
          <Link to="/updates" className="text-sm font-medium text-gray-600 hover:text-gray-950">
            ← Kthehu te përditësimet
          </Link>

          {loading && (
            <div className="mt-10 p-4 rounded-xl border bg-gray-50 text-gray-600">
              Duke ngarkuar përditësimin...
            </div>
          )}

          {!loading && error && (
            <div className="mt-10 p-4 rounded-xl border border-red-100 bg-red-50 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && update && (
            <article className="mt-10">
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span>{statusLabels[update.status] || update.status}</span>
                <span>•</span>
                <span>{update.date_label}</span>
                {update.is_new && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black text-white">
                    NEW
                  </span>
                )}
              </div>

              <h1 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">
                {update.title}
              </h1>

              {update.summary && (
                <p className="mt-6 text-lg text-gray-600 leading-8">
                  {update.summary}
                </p>
              )}

              <div className="mt-10 space-y-6 text-gray-700 leading-8">
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))
                ) : (
                  <p>Mer informacion për këtë përditësim do të publikohet së shpejti.</p>
                )}
              </div>
            </article>
          )}
        </main>
      </div>
    </>
  );
}
