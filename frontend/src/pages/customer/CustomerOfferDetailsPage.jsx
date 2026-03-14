// ==========================================================
// src/pages/customer/CustomerOfferDetailsPage.jsx
// Customer marketplace offer details page
// ==========================================================

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Euro,
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  Phone,
  Mail,
  Loader2
} from "lucide-react";


// ==========================================================
// Helpers
// ==========================================================

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sq-AL", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatPrice(priceAmount, currency, priceType) {
  if (!priceAmount && priceAmount !== 0) return "—";

  const amount = `${priceAmount} ${currency || "EUR"}`;

  if (priceType === "hourly") {
    return `${amount} / orë`;
  }

  return amount;
}


// ==========================================================
// Components
// ==========================================================

function DetailCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
        {Icon && <Icon size={14} />}
        {label}
      </div>

      <div className="mt-3 text-base font-semibold text-zinc-900">
        {value || "—"}
      </div>
    </div>
  );
}

function TextBlock({ title, text }) {

  if (!text) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

      <h3 className="text-sm font-semibold text-zinc-900">
        {title}
      </h3>

      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-700">
        {text}
      </p>

    </div>
  );

}


// ==========================================================
// Page
// ==========================================================

export default function CustomerOfferDetailsPage() {

  const { id } = useParams();
  const navigate = useNavigate();
  const { access, user } = useAuth();

  const [offer, setOffer] = useState(null);
  const [company, setCompany] = useState(null);
  const [version, setVersion] = useState(null);

  const [loading, setLoading] = useState(true);
  const [decisionLoading, setDecisionLoading] = useState("");
  const [error, setError] = useState("");

  const [messages, setMessages] = useState([]);
  const fetchMessages = async () => {
    try {
      const res = await api.get(`offers/${id}/messages/`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Chat load error:", err);
    }
  };
  const [messageInput, setMessageInput] = useState("");

  const API_URL = process.env.REACT_APP_API_BASE_URL || "";


  // ==========================================================
  // Fetch offer
  // ==========================================================

  const fetchOffer = async () => {

    try {

      setLoading(true);

      const res = await api.get(`offers/${id}/`);
      const data = res?.data;

      if (!data) {
        setError("Oferta nuk u gjet.");
        return;
      }

      setOffer(data);
      setCompany(data.company || null);
      setVersion(data.current_version || null);

    } catch (err) {

      console.error(err);
      setError("Nuk mund të ngarkohet oferta.");

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    if (access && id) {

      fetchOffer();
      fetchMessages();

    }

  }, [access, id]);

  // ==========================================================
  // Auto refresh chat
  // ==========================================================

  useEffect(() => {

    if (!id) return;

    const interval = setInterval(() => {

      fetchMessages();

    }, 5000);

    return () => clearInterval(interval);

  }, [id]);


  // ==========================================================
  // Accept offer
  // ==========================================================

  const handleAccept = async () => {

    try {

      setDecisionLoading("accept");

      await api.post(`offers/${id}/decision/`, {
        decision: "accept"
      });

      await fetchOffer();
      alert("Oferta u pranua!");

    } catch (err) {

      console.error(err);
      alert("Nuk mund të pranohet oferta.");

    } finally {

      setDecisionLoading("");

    }

  };


  // ==========================================================
  // Reject offer
  // ==========================================================

  const handleDecline = async () => {

    const confirmed = window.confirm(
      "A jeni i sigurt që dëshironi ta refuzoni këtë ofertë?"
    );

    if (!confirmed) return;

    try {

      setDecisionLoading("reject");

      await api.post(`offers/${id}/decision/`, {
        decision: "reject"
      });

      await fetchOffer();

    } catch (err) {

      console.error(err);
      alert("Nuk mund të refuzohet oferta.");

    } finally {

      setDecisionLoading("");

    }

  };


  // ==========================================================
  // Chat send (MVP)
  // ==========================================================

  const handleSendMessage = async () => {

    if (!messageInput.trim()) return;

    try {

      const res = await api.post(`offers/${id}/messages/`, {
        message: messageInput.trim()
      });

      setMessages(prev => [...prev, res.data]);

      setMessageInput("");

    } catch (err) {

      console.error("Send message error:", err);

      alert("Mesazhi nuk u dërgua.");

    }

  };


  // ==========================================================
  // Download PDF
  // ==========================================================

  const handleDownloadPDF = async () => {

    try {

      const response = await api.get(`offers/${id}/pdf/`, {
        responseType: "blob"
      });

      const blob = new Blob([response.data], {
        type: "application/pdf"
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `oferta_${offer.id}.pdf`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {

      console.error("PDF download error:", error);
      alert("Nuk mund të shkarkohet kontrata.");

    }

  };


  // ==========================================================
  // Derived values
  // ==========================================================

  const canDecide = offer?.status === "signed";

  const priceLabel = useMemo(() => {

    return formatPrice(
      version?.price_amount,
      version?.currency,
      version?.price_type
    );

  }, [version]);


  // ==========================================================
  // Guards
  // ==========================================================

  if (!user) return <div className="p-6">Duke ngarkuar...</div>;

  if (user.role !== "customer") {
    return (
      <div className="p-6 text-red-600 font-semibold">
        Nuk keni qasje në këtë faqe.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2">
        <Loader2 className="animate-spin" size={18} />
        Po ngarkohet oferta...
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!offer || !version) {
    return <div className="p-6">Oferta nuk u gjet.</div>;
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="premium-container mt-6">

      {/* Header */}

      <div className="flex justify-between items-center mb-6">

        <button
          onClick={() => navigate(-1)}
          className="premium-btn btn-light flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Kthehu
        </button>

      </div>


      <div className="grid gap-8 lg:grid-cols-[2fr_360px]">

        {/* LEFT */}

        <div className="space-y-8">

          {/* Company */}

          <section className="premium-card p-6">

            <h2 className="text-xl font-semibold mb-3">
              Kompania që dërgoi ofertën
            </h2>

            <p className="font-semibold text-lg">
              {company?.company_name || "Kompani"}
            </p>

            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Phone size={14} />
              {company?.phone || "—"}
            </p>

            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={14} />
              {company?.user?.email || "—"}
            </p>

          </section>


          {/* Offer details */}

          <section className="premium-card p-6 space-y-6">

            <h2 className="text-xl font-semibold">
              Detajet e ofertës
            </h2>

            <div className="grid md:grid-cols-3 gap-4">

              <DetailCard
                label="Çmimi"
                value={priceLabel}
                icon={Euro}
              />

              <DetailCard
                label="Fillimi"
                value={formatDate(version?.can_start_from)}
                icon={CalendarDays}
              />

              <DetailCard
                label="Kohëzgjatja"
                value={version?.duration_text}
                icon={Clock3}
              />

            </div>

            <TextBlock title="Çfarë përfshihet" text={version?.includes_text} />
            <TextBlock title="Çfarë nuk përfshihet" text={version?.excludes_text} />
            <TextBlock title="Kushtet e pagesës" text={version?.payment_terms} />
            <TextBlock title="Koment nga kompania" text={version?.presentation_text} />

            <button
              onClick={handleDownloadPDF}
              className="premium-btn btn-dark inline-flex items-center gap-2"
            >
              <FileText size={16} />
              Shkarko kontratën PDF
            </button>

          </section>


          {/* Chat */}

          <section className="premium-card p-6">

            <h2 className="text-xl font-semibold mb-4">
              Komunikimi me kompaninë
            </h2>

            <div className="space-y-3 mb-4">
              {messages.map(msg => (

                <div
                  key={msg.id}
                  className={`p-3 rounded-lg max-w-md text-sm ${
                    msg.sender_type === "customer"
                      ? "bg-black text-white ml-auto"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >

                  <div className="font-semibold text-xs mb-1 opacity-70">
                    {msg.sender_name}
                  </div>

                  {msg.message}

                </div>

              ))}
            </div>

            <div className="flex gap-2">

              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder="Shkruani mesazhin..."
                className="premium-input flex-1"
              />
              <button
                onClick={handleSendMessage}
                className="premium-btn btn-dark"
              >
                <Send size={16} />
              </button>

            </div>

          </section>

        </div>


        {/* RIGHT */}

        <aside className="sticky top-6 premium-card p-6 h-fit">

          <h3 className="text-lg font-semibold mb-4">
            Vendimi juaj
          </h3>

          <p className="text-3xl font-bold mb-4">
            {priceLabel}
          </p>

          <div className="space-y-3">

            <button
              onClick={handleAccept}
              disabled={!canDecide}
              className="premium-btn bg-green-600 text-white w-full flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              Prano ofertën
            </button>

            <button
              onClick={handleDecline}
              disabled={!canDecide}
              className="premium-btn bg-red-600 text-white w-full flex items-center justify-center gap-2"
            >
              <XCircle size={18} />
              Refuzo ofertën
            </button>

          </div>

        </aside>

      </div>

    </div>

  );

}