import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import {
  ArrowLeft,
  Building2,
  Euro,
  Clock3,
  FileText,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Star,
  ShieldCheck,
  Hammer,
} from "lucide-react";

export default function CustomerOfferDetailsPage() {

  const { id } = useParams();
  const navigate = useNavigate();
  const { access, user } = useAuth();

  const [offer, setOffer] = useState(null);
  const [company, setCompany] = useState(null);
  const [version, setVersion] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "company",
      text: "Përshëndetje! Nëse keni pyetje për ofertën, na shkruani këtu.",
    }
  ]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [decisionLoading, setDecisionLoading] = useState("");

  const API_URL = process.env.REACT_APP_API_BASE_URL || "";

  // =====================================================
  // LOAD OFFER
  // =====================================================

  const fetchOffer = async () => {

    try {

      setLoading(true);

      const res = await api.get(`offers/${id}/`);
      const data = res.data;

      setOffer(data);
      setCompany(data.company || null);
      setVersion(data.current_version || null);

    } catch {

      console.error("Failed loading offer");

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    if (access && id) {
      fetchOffer();
    }
  }, [access, id]);

  // =====================================================
  // CHAT SEND
  // =====================================================

  const sendMessage = () => {

    if (!input.trim()) return;

    setMessages([
      ...messages,
      {
        id: Date.now(),
        sender: "customer",
        text: input,
      },
    ]);

    setInput("");

  };

  // =====================================================
  // ACCEPT
  // =====================================================

  const handleAccept = async () => {

    try {

      setDecisionLoading("accept");

      await api.post(`offers/${id}/decision/`, {
        decision: "accept",
      });

      await fetchOffer();

      alert("Oferta u pranua!");

    } catch {

      alert("Nuk mund të pranohet oferta.");

    } finally {

      setDecisionLoading("");

    }

  };

  // =====================================================
  // DECLINE
  // =====================================================

  const handleDecline = async () => {

    try {

      setDecisionLoading("reject");

      await api.post(`offers/${id}/decision/`, {
        decision: "reject",
      });

      alert("Oferta u refuzua.");
      navigate("/dashboard/customer");

    } catch {

      alert("Nuk mund të refuzohet oferta.");

    } finally {

      setDecisionLoading("");

    }

  };

  // =====================================================
  // GUARDS
  // =====================================================

  if (!user) return <div className="p-6">Duke ngarkuar...</div>;
  if (user.role !== "customer") return <div className="p-6">Nuk keni qasje.</div>;
  if (loading) return <div className="p-6">Po ngarkohet oferta...</div>;

  const pdfUrl = `${API_URL}/offers/${offer.id}/pdf/`;

  return (

    <div className="premium-container mt-6">

      {/* BACK */}

      <button
        onClick={() => navigate(-1)}
        className="premium-btn btn-light flex items-center gap-2 mb-6"
      >
        <ArrowLeft size={18} />
        Kthehu
      </button>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-8">

        {/* LEFT */}

        <div className="space-y-6">

          {/* COMPANY */}

          <div className="premium-section">

            <h2 className="section-title flex items-center gap-2">
              <Building2 size={20} />
              Kompania që dërgoi ofertën
            </h2>

            <div className="premium-card p-6 space-y-4">

              <div>

                <p className="text-xl font-semibold">
                  {company?.company_name}
                </p>

                <p className="text-sm text-gray-500">
                  Oferta nga kjo kompani për projektin tuaj.
                </p>

              </div>

              <div className="grid md:grid-cols-3 gap-4">

                <div className="premium-card p-4">

                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Star size={16} />
                    Vlerësimi
                  </div>

                  <p className="text-gray-500 text-sm">
                    Së shpejti
                  </p>

                </div>

                <div className="premium-card p-4">

                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck size={16} />
                    Verifikimi
                  </div>

                  <p className="text-gray-500 text-sm">
                    Së shpejti
                  </p>

                </div>

                <div className="premium-card p-4">

                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Hammer size={16} />
                    Projekte
                  </div>

                  <p className="text-gray-500 text-sm">
                    Së shpejti
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* OFFER */}

          <div className="premium-section">

            <h2 className="section-title">
              Detajet e ofertës
            </h2>

            <div className="premium-card p-6 space-y-4">

              <div className="grid md:grid-cols-2 gap-4">

                <div className="premium-card p-4">

                  <p className="text-xs text-gray-500">
                    Çmimi
                  </p>

                  <p className="text-2xl font-bold">
                    {version?.price_amount} {version?.currency}
                  </p>

                </div>

                <div className="premium-card p-4">

                  <p className="text-xs text-gray-500">
                    Afati
                  </p>

                  <p className="flex items-center gap-2">
                    <Clock3 size={16} />
                    {version?.duration_text}
                  </p>

                </div>

              </div>

              <p className="whitespace-pre-line">
                {version?.presentation_text}
              </p>

              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-btn btn-dark flex items-center gap-2 w-fit"
              >
                <FileText size={18} />
                Shkarko kontratën PDF
              </a>

            </div>

          </div>

          {/* CHAT */}

          <div className="premium-section">

            <h2 className="section-title flex items-center gap-2">
              <MessageSquare size={20} />
              Komunikimi me kompaninë
            </h2>

            <div className="premium-card p-6">

              {/* MESSAGES */}

              <div className="space-y-3 mb-4">

                {messages.map((msg) => (

                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg text-sm ${
                      msg.sender === "customer"
                        ? "bg-blue-100 text-right"
                        : "bg-gray-100"
                    }`}
                  >
                    {msg.text}
                  </div>

                ))}

              </div>

              {/* INPUT */}

              <div className="flex gap-2">

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Shkruani mesazh..."
                  className="premium-input flex-1"
                />

                <button
                  onClick={sendMessage}
                  className="premium-btn btn-dark flex items-center gap-2"
                >
                  <Send size={16} />
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* SIDEBAR */}

        <div className="premium-card p-6 h-fit sticky top-6">

          <h3 className="font-semibold text-lg mb-3">
            Vendimi juaj
          </h3>

          <div className="flex flex-col gap-3">

            <button
              onClick={handleAccept}
              className="premium-btn bg-green-600 text-white flex items-center gap-2 justify-center"
            >
              <CheckCircle2 size={18} />
              Prano ofertën
            </button>

            <button
              onClick={handleDecline}
              className="premium-btn bg-red-600 text-white flex items-center gap-2 justify-center"
            >
              <XCircle size={18} />
              Refuzo ofertën
            </button>

          </div>

        </div>

      </div>

    </div>

  );
}