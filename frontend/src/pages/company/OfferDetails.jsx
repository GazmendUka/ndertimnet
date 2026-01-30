// src/pages/company/OfferDetails.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import {
  ArrowLeft,
  Pencil,
  Download,
  Clock,
  Euro,
  Briefcase,
  MapPin,
  Tag,
  FileSignature,
  Layers,
  FileText,
  Info,
} from "lucide-react";

import StatusBadge from "../../components/ui/StatusBadge";

export default function OfferDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { access, user } = useAuth();

  const [offer, setOffer] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(true);

  const downloadPdf = async () => {
    try {
      const res = await api.get(`/offers/${offer.id}/pdf/`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const win = window.open(url);
      if (win) {
        win.onload = () => {
          win.print(); // auto print dialog
        };
      }

    } catch (err) {
      console.error("PDF error:", err);
      alert("Nuk u arrit krijimi i PDF-së");
    }
  };


  // ===============================
  // LOAD OFFER + VERSIONS
  // ===============================
  useEffect(() => {
    if (!access) return;

    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const res = await api.get(`/offers/${id}/`);
        if (!alive) return;
        setOffer(res.data);
      } catch (err) {
        console.error("Error fetching offer:", err);
        if (!alive) return;
        setOffer(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    async function loadVersions() {
      setLoadingVersions(true);
      try {
        const v = await api.get(`/offers/${id}/versions/`);
        if (!alive) return;
        setVersions(Array.isArray(v.data) ? v.data : []);
      } catch (err) {
        // inte fatal
        console.warn("Could not load versions:", err);
        if (!alive) return;
        setVersions([]);
      } finally {
        if (!alive) return;
        setLoadingVersions(false);
      }
    }

    load();
    loadVersions();

    return () => {
      alive = false;
    };
  }, [id, access]);

  // ===============================
  // DERIVED
  // ===============================
  const job = offer?.job_request || null;
  const v = offer?.current_version || null;

  const statusExplain = useMemo(() => {
    const s = offer?.status;
    if (s === "draft") return "Draft – e pa nënshkruar";
    if (s === "signed") return "E nënshkruar – në pritje të përgjigjes së klientit";
    if (s === "accepted") return "E pranuar – klienti e ka konfirmuar";
    if (s === "rejected") return "E refuzuar – klienti e ka refuzuar";
    // fallback
    return "Status ende i panjohur";
  }, [offer?.status]);

  const createdDate = useMemo(() => {
    if (!offer?.created_at) return null;
    const d = new Date(offer.created_at);
    return isNaN(d.getTime()) ? null : d;
  }, [offer?.created_at]);

  // ===============================
  // GUARDS
  // ===============================
  if (!user) return <div className="p-6">Duke u ngarkuar…</div>;
  if (loading) return <div className="p-6">Duke u ngarkuar…</div>;

  if (!offer) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={16} />
          Kthehu
        </button>

        <div className="mt-4 text-red-600 font-semibold">
          Oferta nuk u gjet
        </div>
      </div>
    );
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* BACK */}
      <button
        onClick={() => navigate("/leads/mine")}
        className="premium-btn btn-light inline-flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        Kthehu
      </button>


      {/* HEADER / MAIN CARD */}
      <div className="bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold">Oferta #{offer.id}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={offer.status} />
              <span className="text-sm text-gray-600">{statusExplain}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* PDF */}
            <button
              onClick={downloadPdf}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Download size={16} />
              PDF
            </button>


            {/* EDIT */}
            {job?.id && (
              <Link
                to={`/company/jobrequests/${job.id}/offer/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90"
              >
                <Pencil size={16} />
                Redakto
              </Link>
            )}
          </div>
        </div>

        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
          <InfoRow icon={<Briefcase size={16} />} label="Projekti">
            {job?.title || "Ingen titel"}
          </InfoRow>

          <InfoRow icon={<MapPin size={16} />} label="Qyteti">
            {job?.city_detail?.name || "Okänd"}
          </InfoRow>

          <InfoRow icon={<Tag size={16} />} label="Kërkohët">
            {job?.profession_detail?.name || "ENuk specifikohet"}
          </InfoRow>

          <InfoRow icon={<Euro size={16} />} label="Qmimi">
            {v?.price_amount != null && String(v.price_amount) !== ""
              ? `${v.price_amount} ${v?.currency || "EUR"}`
              : "Nuk specifikohet"}
          </InfoRow>

          <InfoRow icon={<Clock size={16} />} label="Afati">
            {v?.duration_text || "Nuk specifikohet"}
          </InfoRow>

          <InfoRow icon={<FileSignature size={16} />} label="Nënshkruar">
            {v?.is_signed ? "Po" : "Jo"}
          </InfoRow>

          <InfoRow icon={<Info size={16} />} label="Krijuar">
            {createdDate ? createdDate.toLocaleDateString() : "—"}
          </InfoRow>

          <InfoRow icon={<FileText size={16} />} label="Përfshihet">
            {v?.includes_text || "Nuk specifikohet"}
          </InfoRow>

          <InfoRow icon={<FileText size={16} />} label="Nuk përfshihet">
            {v?.excludes_text || "Nuk specifikohet"}
          </InfoRow>
        </div>

        {/* CUSTOMER DESCRIPTION */}
        <Section title="Përshkrimi prej klientit">
          {job?.description || "Nuk ka përshkrim"}
        </Section>

        {/* OFFER TEXT */}
        <Section title="Përshkrimi janë">
          {v?.presentation_text || "Oferta nuk ka tekst."}
        </Section>

        {/* Payment terms (nice-to-have) */}
        {(v?.payment_terms || "").trim() && (
          <Section title="Kushtet e pagesës">
            {v.payment_terms}
          </Section>
        )}
      </div>

      {/* VERSION TIMELINE */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Layers size={18} /> Historiku i versioneve
        </h3>

        {loadingVersions ? (
          <p className="text-sm text-gray-500">Duke ngarkuar historikun e versioneve…</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Vetëm versioni aktual është i disponueshëm.
          </p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-2">
            {versions.map((ver, idx) => (
              <li key={ver.id} className="mb-6 ml-4">
                <span className="absolute -left-2 flex items-center justify-center w-4 h-4 bg-black rounded-full" />

                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold">
                    Versioni {ver.version_number}
                  </h4>

                  {/* markera current */}
                  {ver.id === offer?.current_version?.id && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-900 text-white">
                      Aktual
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  Krijuar:{" "}
                  {ver.created_at
                    ? new Date(ver.created_at).toLocaleDateString()
                    : "—"}
                </p>

                <div className="text-sm mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    Qmimi:{" "}
                    <b>
                      {ver.price_amount != null && String(ver.price_amount) !== ""
                        ? `${ver.price_amount} ${ver.currency || "EUR"}`
                        : "Nuk specifikohet"}
                    </b>
                  </div>

                  <div>
                    Afati: <b>{ver.duration_text || "—"}</b>
                  </div>

                  <div>
                    Nënshkruar: <b>{ver.is_signed ? "Po" : "Jo"}</b>
                  </div>

                  <div>
                    Oferta me përshkrim: <b>{ver.includes_text ? "Po" : "Jo"}</b> 
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ------------------ small components ------------------ */

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 text-gray-700">{icon}</span>
      <span className="text-gray-700">
        {label}: <b className="text-gray-900">{children}</b>
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="pt-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-gray-700 whitespace-pre-line">{children}</p>
    </div>
  );
}
