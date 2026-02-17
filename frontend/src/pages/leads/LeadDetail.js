// src/pages/leads/LeadDetail.js

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";



import {
  Building2,
  FileText,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { access, user, isEmailVerified } = useAuth();

  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [followUpMessage, setFollowUpMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState("");

  const chatRef = useRef(null);

  /* ============================================================
     Load Lead Data
  ============================================================ */
  useEffect(() => {
    if (!access) {
      setLoading(false);
      return;
    }

    async function fetchLead() {
      try {
        const res = await api.get(`/leads/leadmatches/${id}/`, {
          headers: { Authorization: `Bearer ${access}` },
        });
        setLead(res.data);
      } catch (err) {
        setError("Nuk mund të ngarkohet oferta.");
      } finally {
        setLoading(false);
      }
    }

    fetchLead();
  }, [id, access]);

  /* ============================================================
     Load Messages (auto-refresh every 10 sec)
  ============================================================ */
  useEffect(() => {
    if (!access) return;

    async function fetchMessages() {
      try {
        const res = await api.get(`/leads/leadmessages/?lead=${id}`, {
          headers: { Authorization: `Bearer ${access}` },
        });

        const data = res.data?.results || res.data || [];
        const normalized = Array.isArray(data) ? data : [data];

        setMessages(normalized);
      } catch (err) {
        console.error("Gabim gjatë ngarkimit të mesazheve:", err);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [id, access]);

  /* ============================================================
     Scroll Chat to Bottom
  ============================================================ */
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  /* ============================================================
     Send Follow-Up Message
  ============================================================ */
  async function handleSendFollowUp() {
    if (!followUpMessage.trim()) return;

    try {
      const res = await api.post(
        "/leads/leadmessages/",
        {
          lead: id,
          sender_type: "company",
          message: followUpMessage,
        },
        {
          headers: { Authorization: `Bearer ${access}` },
        }
      );

      setMessages((prev) => [...prev, res.data]);
      setFollowUpMessage("");
    } catch (err) {
      alert("Gabim gjatë dërgimit të mesazhit.");
    }
  }

  /* ============================================================
     Status styling
  ============================================================ */
  if (loading)
    return <p className="text-center mt-10">🔄 Po ngarkohet oferta...</p>;
  if (error)
    return <p className="text-center text-red-500 mt-10">{error}</p>;
  if (!lead)
    return <p className="text-center mt-10">❌ Oferta nuk u gjet.</p>;

  const { status, kompania, kerkesa, mesazhi } = lead;

  const statusLabel =
    status === "won" ? "Fitues" : status === "lost" ? "Humbës" : "Aktiv";

  const statusStyle =
    status === "won"
      ? "bg-yellow-50 border-yellow-300"
      : status === "lost"
      ? "bg-red-50 border-red-300"
      : "bg-green-50 border-green-300";

  const statusIcon =
    status === "won" ? (
      <CheckCircle className="text-yellow-600" />
    ) : status === "lost" ? (
      <XCircle className="text-red-600" />
    ) : (
      <CheckCircle className="text-green-600" />
    );

  /* ============================================================
     UI
  ============================================================ */
  return (
    <div className="premium-container">

      {/* BACK BUTTONS */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/dashboard/company")}
          className="premium-btn btn-light inline-flex items-center"
        >
          🏠 Dashboard
        </button>

        <button
          onClick={() => navigate("/leads/mine")}
          className="premium-btn btn-light inline-flex items-center"
        >
          <ArrowLeft size={18} />
          Kthehu mbrapa
        </button>
      </div>

      {/* LEAD CARD */}
      <div className={`premium-card p-6 border ${statusStyle}`}>

        <div className="flex justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-blue-600" />
            {kerkesa?.title}
          </h1>

          <span className="flex items-center gap-1 font-semibold text-gray-700">
            {statusIcon} {statusLabel}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 mb-6">
          <p><MapPin className="inline w-4 h-4 text-gray-500 mr-2" /> {kerkesa?.location}</p>
          <p><Building2 className="inline w-4 h-4 text-gray-500 mr-2" /> {kompania?.name}</p>
          <p><Clock className="inline w-4 h-4 text-gray-500 mr-2" /> {new Date(lead.krijuar_me).toLocaleDateString("sv-SE")}</p>
          <p>💰 {kerkesa?.budget ? `${kerkesa.budget} €` : "Pa buxhet"}</p>
        </div>

        {/* Original Message */}
        <div className="premium-card p-4 mb-6">
          <h3 className="font-semibold mb-2">Mesazhi juaj</h3>
          <p className="text-gray-700 whitespace-pre-line">
            {mesazhi || "Asnjë mesazh nuk është dërguar."}
          </p>
        </div>

        {/* FOLLOW-UP (only if active) */}
        {status === "active" && (
          <div className="premium-card p-4 mb-6">
            <h3 className="font-semibold mb-2">📩 Ndiq ofertën</h3>

            {!isEmailVerified && (
              <p className="text-sm text-amber-700 mb-2">
                🔒 Ju lutem verifikoni email-in për të komunikuar me klientin.
              </p>
            )}

            <textarea
              rows={3}
              disabled={!isEmailVerified}
              className={`w-full border rounded-lg p-3 mb-3 ${
                !isEmailVerified ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
              placeholder={
                user.email_verified
                  ? "Shkruaj mesazhin tuaj..."
                  : "Verifikoni email-in për të dërguar mesazhe"
              }
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
            />

            <button
              onClick={handleSendFollowUp}
              disabled={!isEmailVerified || !followUpMessage.trim()}
              className={`premium-btn btn-dark ${
                !isEmailVerified ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={
                !isEmailVerified
                  ? "Ju lutem verifikoni email-in për të komunikuar me klientin"
                  : ""
              }
            >
              Dërgo mesazhin
            </button>

          </div>
        )}

        {/* CHAT */}
        <div>
          <h3 className="text-lg font-semibold mb-3">💬 Komunikimi</h3>

          <div
            ref={chatRef}
            className="max-h-80 overflow-y-auto pr-2 space-y-3"
          >
            {loadingMessages ? (
              <p className="text-sm text-gray-500">Po ngarkohen mesazhet...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-500">Asnjë mesazh ende.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender_type === "company"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-xl p-3 shadow-sm ${
                      msg.sender_type === "company"
                        ? "bg-blue-100"
                        : "bg-gray-200"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {new Date(msg.krijuar_me).toLocaleString("sv-SE")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER STATUS MESSAGES */}
        {status === "won" && (
          <p className="text-center text-yellow-700 mt-6 font-medium">
            ✅ Oferta juaj është pranuar nga klienti!
          </p>
        )}
        {status === "lost" && (
          <p className="text-center text-red-600 mt-6 font-medium">
            ❌ Kjo ofertë nuk është pranuar. Një kompani tjetër ka fituar.
          </p>
        )}
      </div>
    </div>
  );
}
