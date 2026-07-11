import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

import {
  ArrowLeft,
  Pencil,
  Download,
  Euro,
  Briefcase,
  Layers,
  FileText,
  Info,
  MessageCircle,
  Send,
  Loader2,
  RotateCcw,
} from "lucide-react";

import StatusBadge from "../../components/ui/StatusBadge";

function formatMessageTime(value) {
  if (!value) return "";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function messageDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toDateString();
}

function formatMessageDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Sot";
  if (date.toDateString() === yesterday.toDateString()) return "Dje";

  return date.toLocaleDateString("sq-AL", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default function OfferDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { access, user } = useAuth();

  const [offer, setOffer] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(true);

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const inputRef = useRef(null);

  // ===============================
  // PDF DOWNLOAD
  // ===============================

  const downloadPdf = async () => {
    if (!offer?.id) return;

    try {
      const res = await api.get(`/offers/${offer.id}/pdf/`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `oferta_${offer.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF error:", err);
      alert("Nuk u arrit krijimi i PDF-së");
    }
  };

  // ===============================
  // CHAT
  // ===============================

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/offers/${id}/messages/`);
      const serverMessages = Array.isArray(res.data) ? res.data : [];
      setMessages((current) => [
        ...serverMessages,
        ...current.filter((message) => String(message.id).startsWith("temp-")),
      ]);
    } catch (err) {
      console.error("Chat load error:", err);
    } finally {
      setChatLoading(false);
    }
  }, [id]);

  const sendMessage = async (content = messageInput, retryId = null) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const tempMessage = {
      id: `temp-${Date.now()}`,
      message: trimmed,
      sender_name: user?.first_name || user?.email || "You",
      sender_type: "company",
      created_at: new Date().toISOString(),
      delivery_status: "sending",
    };

    shouldAutoScrollRef.current = true;
    setIsSending(true);
    setMessages((prev) => [
      ...prev.filter((message) => message.id !== retryId),
      tempMessage,
    ]);
    setMessageInput("");

    try {
      const res = await api.post(`/offers/${id}/messages/`, {
        message: trimmed,
      });

      if (res.data) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((msg) => msg.id !== tempMessage.id);
          const alreadyLoaded = withoutTemp.some(
            (msg) => String(msg.id) === String(res.data.id)
          );

          return alreadyLoaded ? withoutTemp : [...withoutTemp, res.data];
        });
      }
    } catch (err) {
      console.error("Send message error:", err);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id
            ? { ...msg, delivery_status: "failed" }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  // ===============================
  // LOAD OFFER + VERSIONS
  // ===============================

  useEffect(() => {
    if (!access || !id) return;

    let alive = true;

    async function loadOffer() {
      setLoading(true);

      try {
        const res = await api.get(`/offers/${id}/`);
        if (!alive) return;

        setOffer(res.data || null);
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
        const res = await api.get(`/offers/${id}/versions/`);
        if (!alive) return;

        setVersions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.warn("Could not load versions:", err);
        if (!alive) return;

        setVersions([]);
      } finally {
        if (!alive) return;

        setLoadingVersions(false);
      }
    }

    loadOffer();
    loadVersions();
    fetchMessages();

    return () => {
      alive = false;
    };
  }, [id, access, fetchMessages]);

  // ===============================
  // CHAT POLLING
  // ===============================

  useEffect(() => {
    if (!id) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [id, fetchMessages]);

  // ===============================
  // AUTO SCROLL CHAT
  // ===============================

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ===============================
  // AUTO FOCUS INPUT
  // ===============================

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ===============================
  // DERIVED DATA
  // ===============================

  const job = offer?.job_request || null;
  const v = offer?.current_version || null;

  const statusExplain = useMemo(() => {
    const s = offer?.status;

    if (s === "draft") return "Draft – e pa nënshkruar";
    if (s === "signed") return "E nënshkruar – në pritje të përgjigjes së klientit";
    if (s === "accepted") return "E pranuar – klienti e ka konfirmuar";
    if (s === "rejected") return "E refuzuar – klienti e ka refuzuar";

    return "Status ende i panjohur";
  }, [offer?.status]);

  const createdDate = useMemo(() => {
    if (!offer?.created_at) return null;

    const d = new Date(offer.created_at);
    return Number.isNaN(d.getTime()) ? null : d;
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
        onClick={() => navigate("/company/leads/mine")}
        className="premium-btn btn-light inline-flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        Kthehu
      </button>

      {/* OFFER OVERVIEW */}

      <div className="premium-card overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:justify-between md:items-start gap-5">
          <div>
            <p className="text-label mb-2">Detajet e ofertës</p>
            <h1 className="text-2xl font-bold">{job?.title || `Oferta #${offer.id}`}</h1>
            <p className="text-sm text-gray-500 mt-1">Oferta #{offer.id}</p>
            <div className="mt-3"><StatusBadge status={offer.status} /></div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={downloadPdf} className="premium-btn btn-light inline-flex items-center gap-2">
              <Download size={16} /> Shkarko PDF
            </button>
            {job?.id && (
              <Link to={`/company/jobrequests/${job.id}/offer/edit`} className="premium-btn btn-dark inline-flex items-center gap-2">
                <Pencil size={16} /> Redakto
              </Link>
            )}
          </div>
        </div>

        <div className="border-y border-gray-100 bg-gray-50 px-6 py-4 md:px-8 flex gap-3 items-start">
          <Info size={18} className="text-gray-500 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-700">{statusExplain}</p>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoSection title="Projekti" icon={<Briefcase size={18} />}>
            <DetailRow label="Projekti" value={job?.title} />
            <DetailRow label="Qyteti" value={job?.city_detail?.name} />
            <DetailRow
              label="Kategoria"
              value={job?.profession_detail?.industry_detail?.name
                ? `${job.profession_detail.industry_detail.name} / ${job.profession_detail.name}`
                : job?.profession_detail?.name}
            />
            <DetailRow label="Krijuar" value={createdDate?.toLocaleDateString("sq-AL")} />
          </InfoSection>

          <InfoSection title="Çmimi dhe afati" icon={<Euro size={18} />}>
            <DetailRow label="Çmimi" value={v?.price_amount ? `${v.price_amount} ${v.currency || "EUR"}` : null} strong />
            <DetailRow label="Lloji i çmimit" value={v?.price_type} />
            <DetailRow label="Mund të fillojë" value={v?.can_start_from} />
            <DetailRow label="Kohëzgjatja" value={v?.duration_text} />
            <DetailRow label="Nënshkruar" value={v?.is_signed ? "Po" : "Jo"} />
          </InfoSection>

          <div className="lg:col-span-2">
            <InfoSection title="Përmbajtja e ofertës" icon={<FileText size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextPanel title="Përfshihet" text={v?.includes_text} positive />
                <TextPanel title="Nuk përfshihet" text={v?.excludes_text} />
              </div>
              {v?.payment_terms && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Kushtet e pagesës</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{v.payment_terms}</p>
                </div>
              )}
            </InfoSection>
          </div>
        </div>
      </div>

      {/* CHAT */}

      <div className="premium-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-900 text-white flex items-center justify-center">
            <MessageCircle size={19} />
          </div>
          <div>
            <h3 className="font-semibold">Komunikimi me klientin</h3>
            <p className="text-xs text-gray-500">Mesazhet rifreskohen automatikisht</p>
          </div>
        </div>

        <div
          ref={chatContainerRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            shouldAutoScrollRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
          }}
          className="p-6 space-y-3 min-h-[260px] max-h-[460px] overflow-y-auto bg-gray-50/70"
        >
          {chatLoading && (
            <div className="h-40 flex items-center justify-center text-gray-400">
              <Loader2 className="animate-spin" size={22} />
            </div>
          )}

          {!chatLoading && messages.length === 0 && (
            <div className="py-14 text-center">
              <MessageCircle size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-700">Nuk ka ende mesazhe</p>
              <p className="text-xs text-gray-500 mt-1">Shkruani mesazhin e parë për klientin.</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const showDate = index === 0 || messageDateKey(messages[index - 1]?.created_at) !== messageDateKey(msg.created_at);
            const isCompany = msg.sender_type === "company";

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 py-2">
                    <span className="h-px bg-gray-200 flex-1" />
                    <span className="text-[11px] font-medium text-gray-500">{formatMessageDate(msg.created_at)}</span>
                    <span className="h-px bg-gray-200 flex-1" />
                  </div>
                )}
                <div className={`max-w-[85%] md:max-w-[70%] ${isCompany ? "ml-auto" : "mr-auto"}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    isCompany ? "bg-gray-900 text-white rounded-br-md" : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                  } ${msg.delivery_status === "failed" ? "ring-2 ring-red-300" : ""}`}>
                    <div className="font-semibold text-xs mb-1 opacity-70">{msg.sender_name}</div>
                    <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                    <div className="text-[10px] opacity-60 mt-1 text-right">
                      {msg.delivery_status === "sending" ? "Duke u dërguar…" : formatMessageTime(msg.created_at)}
                    </div>
                  </div>
                  {msg.delivery_status === "failed" && (
                    <button type="button" onClick={() => sendMessage(msg.message, msg.id)} className="mt-1 ml-auto flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
                      <RotateCcw size={12} /> Provo përsëri
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 md:p-5 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              rows={2}
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Shkruani mesazhin…"
              className="premium-input flex-1 resize-none min-h-[52px]"
            />
            <button onClick={() => sendMessage()} disabled={!messageInput.trim() || isSending} className="premium-btn btn-dark h-[52px] inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              {isSending ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              <span className="hidden sm:inline">Dërgo</span>
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Enter për ta dërguar · Shift + Enter për rresht të ri</p>
        </div>
      </div>

      {/* VERSION HISTORY */}

      <div className="bg-white rounded-2xl shadow p-6">

        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Layers size={18} /> Historiku i versioneve
        </h3>

        {loadingVersions ? (
          <p className="text-sm text-gray-500">
            Duke ngarkuar historikun e versioneve…
          </p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Vetëm versioni aktual është i disponueshëm.
          </p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-2">

            {versions.map((ver) => (
              <li key={ver.id} className="mb-6 ml-4">

                <span className="absolute -left-2 flex items-center justify-center w-4 h-4 bg-black rounded-full" />

                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold">
                    Versioni {ver.version_number}
                  </h4>

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
                      {ver.price_amount
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

function InfoSection({ title, icon, children }) {
  return (
    <section className="rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold flex items-center gap-2 mb-4 text-gray-900">
        <span className="text-gray-500">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-right text-gray-900 ${strong ? "font-bold" : "font-medium"}`}>
        {value || "Nuk specifikohet"}
      </span>
    </div>
  );
}

function TextPanel({ title, text, positive = false }) {
  return (
    <div className={`rounded-xl border p-4 ${positive ? "border-green-200 bg-green-50/60" : "border-gray-200 bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${positive ? "text-green-700" : "text-gray-600"}`}>
        {title}
      </p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
        {text || "Nuk specifikohet"}
      </p>
    </div>
  );
}
