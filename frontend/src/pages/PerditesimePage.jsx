// ===========================================
// src/pages/PerditesimePage.jsx
// Ndertimnet - Përditësime / Roadmap Page
// ===========================================

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import api from "../api/axios";

const emptyPerditesime = {
  in_progress: [],
  planned: [],
  done: [],
};

export default function PerditesimePage() {
  const [perditesime, setPerditesime] = useState(emptyPerditesime);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPerditesime = async () => {
      try {
        const response = await api.get("perditesime/", { skipAuth: true });

        if (!isMounted) {
          return;
        }

        setPerditesime({
          in_progress: response.data?.in_progress || [],
          planned: response.data?.planned || [],
          done: response.data?.done || [],
        });
        setError("");
      } catch (err) {
        if (isMounted) {
          setError("Përditësimet nuk mund të ngarkohen për momentin.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPerditesime();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasPerditesime = useMemo(
    () =>
      perditesime.in_progress.length > 0 ||
      perditesime.planned.length > 0 ||
      perditesime.done.length > 0,
    [perditesime]
  );

  // ================= COMPONENT =================
  const Item = ({ item, variant = "light" }) => {
    const className = `p-4 rounded-xl border flex items-center justify-between gap-4 ${
        variant === "light" ? "bg-gray-50" : "bg-white"
      } ${item.detail_url ? "transition hover:border-gray-900 hover:bg-white" : ""}`;

    const content = (
      <>
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-gray-500 mt-1">
            Planifikuar: {item.date_label}
          </p>
          {item.summary && (
            <p className="text-sm text-gray-600 mt-2">
              {item.summary}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {item.is_new && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black text-white">
              NEW
            </span>
          )}

          {item.detail_url && (
            <span className="text-sm font-medium text-gray-700">
              Lexo më shumë
            </span>
          )}
        </div>
      </>
    );

    if (item.detail_url) {
      return (
        <Link to={item.detail_url} className={className}>
          {content}
        </Link>
      );
    }

    return (
      <div className={className}>
        {content}
      </div>
    );
  };

  const EmptyState = () => (
    <div className="p-4 rounded-xl border bg-gray-50 text-gray-600">
      Nuk ka përditësime të publikuara këtu për momentin.
    </div>
  );

  const PerditesimSection = ({ title, items, variant = "light" }) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <section className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold mb-6">
          {title}
        </h2>

        <div className="space-y-4">
          {items.map((item) => (
            <Item key={item.id} item={item} variant={variant} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
      {/* ================= SEO ================= */}
      <Helmet>
        <html lang="sq" />

        <title>
          Përditësimet e platformës | Ndertimnet
        </title>

        <meta
          name="description"
          content="Shiko çfarë po ndërtojmë në Ndertimnet. Ndiq përditësimet, funksionalitetet e reja dhe planet tona për të ardhmen."
        />

        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* ================= PAGE ================= */}
      <div className="bg-white text-gray-900">

        {/* ================= HERO ================= */}
        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Çfarë po ndërtojmë
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            Në Ndertimnet ne punojmë vazhdimisht për të përmirësuar platformën.
            Këtu mund të shihni funksionalitetet që janë në zhvillim, ato që
            planifikojmë dhe ato që kemi publikuar së fundmi.
          </p>
        </section>

        {loading && (
          <section className="max-w-4xl mx-auto px-6 py-10">
            <div className="p-4 rounded-xl border bg-gray-50 text-gray-600">
              Duke ngarkuar përditësimet...
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="max-w-4xl mx-auto px-6 py-10">
            <div className="p-4 rounded-xl border border-red-100 bg-red-50 text-red-700">
              {error}
            </div>
          </section>
        )}

        {!loading && !error && !hasPerditesime && (
          <section className="max-w-4xl mx-auto px-6 py-10">
            <EmptyState />
          </section>
        )}

        {/* ================= IN PROGRESS ================= */}
        {!loading && !error && hasPerditesime && (
          <PerditesimSection title="🚧 Në zhvillim" items={perditesime.in_progress} />
        )}

        {/* ================= PLANNED ================= */}
        {!loading && !error && hasPerditesime && (
          <PerditesimSection title="🧭 Në plan" items={perditesime.planned} variant="white" />
        )}

        {/* ================= DONE ================= */}
        {!loading && !error && hasPerditesime && (
          <PerditesimSection title="✅ Të publikuara" items={perditesime.done} />
        )}

      </div>
    </>
  );
}
