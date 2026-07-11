import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import CompanyRatingSummary from "../../components/reviews/CompanyRatingSummary";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Euro,
  FileText,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  ImagePlus,
  Phone,
  Send,
  ShieldCheck,
  Star,
  ThumbsUp,
  XCircle,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sq-AL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("sq-AL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatPrice(priceAmount, currency, priceType) {
  if (!priceAmount && priceAmount !== 0) return "—";

  const numericAmount = Number(priceAmount);
  const amount = Number.isNaN(numericAmount)
    ? priceAmount
    : new Intl.NumberFormat("sq-AL", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(numericAmount);
  const formatted = `${amount} ${currency || "EUR"}`;

  return priceType === "hourly" ? `${formatted} / orë` : formatted;
}

function getStatusMeta(status) {
  if (status === "accepted") {
    return {
      label: "Oferta u pranua",
      description: "Ju e keni zgjedhur këtë kompani për punën tuaj.",
      classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }

  if (status === "rejected") {
    return {
      label: "Oferta u refuzua",
      description: "Nuk mund të merrni më vendim për këtë ofertë.",
      classes: "border-rose-200 bg-rose-50 text-rose-700",
      dot: "bg-rose-500",
    };
  }

  return {
    label: "Në pritje të vendimit",
    description: "Shqyrtoni detajet para se të merrni vendimin tuaj.",
    classes: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  };
}

function DetailCard({ label, value, icon: Icon, featured = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        featured
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-gray-50/70 text-gray-900"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
          featured ? "text-gray-300" : "text-gray-500"
        }`}
      >
        <Icon size={15} />
        {label}
      </div>
      <div className="mt-3 text-base font-semibold sm:text-lg">{value || "—"}</div>
    </div>
  );
}

function TextBlock({ title, text, tone = "default" }) {
  if (!text) return null;

  const positive = tone === "positive";

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        positive
          ? "border-emerald-100 bg-emerald-50/60"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            positive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {positive ? <CheckCircle2 size={17} /> : <FileText size={16} />}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ navigate, short = false }) {
  return (
    <div className="premium-container mt-6">
      <div className="premium-card max-w-3xl p-8">
        <button
          onClick={() => navigate(-1)}
          className="premium-btn btn-light mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Kthehu
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Ende nuk ka ofertë</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
          Për këtë kërkesë nuk është dërguar ende asnjë ofertë.
          {!short && " Nëse një kompani e dërgon ofertën më vonë, ajo do të shfaqet këtu."}
        </p>
      </div>
    </div>
  );
}

export default function CustomerOfferDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { access, user } = useAuth();

  const [offer, setOffer] = useState(null);
  const [company, setCompany] = useState(null);
  const [version, setVersion] = useState(null);
  const [noOfferYet, setNoOfferYet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [decisionLoading, setDecisionLoading] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewImage, setReviewImage] = useState(null);
  const [recommended, setRecommended] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`offers/${id}/messages/`);
      setMessages(res.data || []);
    } catch (err) {
      if (err.response?.status !== 404) console.error("Chat load error:", err);
    }
  }, [id]);

  const fetchOffer = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setNoOfferYet(false);
      setOffer(null);
      setCompany(null);
      setVersion(null);

      const res = await api.get(`offers/${id}/`);
      const data = res?.data;

      if (!data) {
        setNoOfferYet(true);
        setMessages([]);
        return;
      }

      setOffer(data);
      setCompany(data.company || null);
      setVersion(data.current_version || null);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setNoOfferYet(true);
        setMessages([]);
        return;
      }
      setError("Nuk mund të ngarkohet oferta.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (access && id) fetchOffer();
  }, [access, id, fetchOffer]);

  useEffect(() => {
    if (access && id && offer && !noOfferYet) fetchMessages();
  }, [access, id, offer, noOfferYet, fetchMessages]);

  useEffect(() => {
    if (!id || noOfferYet) return undefined;
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [id, noOfferYet, fetchMessages]);

  const handleAccept = async () => {
    try {
      setDecisionLoading("accept");
      await api.post(`offers/${id}/decision/`, { decision: "accept" });
      await fetchOffer();
      alert("Oferta u pranua!");
    } catch (err) {
      console.error(err);
      alert("Nuk mund të pranohet oferta.");
    } finally {
      setDecisionLoading("");
    }
  };

  const handleDecline = async () => {
    const confirmed = window.confirm(
      "A jeni i sigurt që dëshironi ta refuzoni këtë ofertë?"
    );
    if (!confirmed) return;

    try {
      setDecisionLoading("reject");
      await api.post(`offers/${id}/decision/`, { decision: "reject" });
      await fetchOffer();
    } catch (err) {
      console.error(err);
      alert("Nuk mund të refuzohet oferta.");
    } finally {
      setDecisionLoading("");
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sendingMessage || offer?.chat_locked) return;

    try {
      setSendingMessage(true);
      const res = await api.post(`offers/${id}/messages/`, {
        message: messageInput.trim(),
      });
      setMessages((prev) => [...prev, res.data]);
      setMessageInput("");
    } catch (err) {
      console.error("Send message error:", err);
      alert("Mesazhi nuk u dërgua.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    setReviewError("");

    if (!reviewRating) {
      setReviewError("Ju lutemi zgjidhni nga 1 deri në 5 yje.");
      return;
    }
    if (reviewText.trim().length < 10) {
      setReviewError("Shkruani të paktën 10 karaktere për përvojën tuaj.");
      return;
    }

    const formData = new FormData();
    formData.append("rating", reviewRating);
    formData.append("review_text", reviewText.trim());
    formData.append("recommended", recommended);
    if (reviewImage) formData.append("image", reviewImage);

    try {
      setReviewLoading(true);
      await api.post(`offers/${id}/review/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchOffer();
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.detail || data?.review_text?.[0] || data?.image?.[0];
      setReviewError(detail || "Vlerësimi nuk mund të dërgohej. Provoni përsëri.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`offers/${id}/pdf/`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `oferta_${offer.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("PDF download error:", downloadError);
      alert("Nuk mund të shkarkohet kontrata.");
    }
  };

  const canDecide = offer?.status === "signed";
  const priceLabel = useMemo(
    () => formatPrice(version?.price_amount, version?.currency, version?.price_type),
    [version]
  );
  const statusMeta = getStatusMeta(offer?.status);
  const companyName = company?.company_name || "Kompani";
  const companyInitial = companyName.trim().charAt(0).toUpperCase() || "K";
  const review = offer?.review || null;
  const chatLocked = Boolean(offer?.chat_locked || review);

  if (!user) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-600">
        <Loader2 className="animate-spin" size={18} /> Duke ngarkuar...
      </div>
    );
  }

  if (user.role !== "customer") {
    return <div className="p-6 font-semibold text-red-600">Nuk keni qasje në këtë faqe.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-gray-600">
        <Loader2 className="animate-spin" size={20} /> Po ngarkohet oferta...
      </div>
    );
  }

  if (noOfferYet) return <EmptyState navigate={navigate} />;

  if (error) {
    return (
      <div className="premium-container mt-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      </div>
    );
  }

  if (!offer || !version) return <EmptyState navigate={navigate} short />;

  return (
    <div className="premium-container mt-2 sm:mt-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="premium-btn btn-light inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Kthehu te kërkesa
        </button>
      </div>

      <section className="overflow-hidden rounded-3xl bg-gray-900 text-white shadow-xl shadow-gray-200/70">
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-gray-200">
                  Oferta #{offer.id}
                </span>
                <span className="text-xs text-gray-400">Dërguar më {formatDate(offer.created_at)}</span>
              </div>
              <p className="text-sm font-medium text-blue-300">Ofertë për kërkesën tuaj</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
                {offer.job_request?.title || "Detajet e ofertës"}
              </h1>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-gray-900">
                  {companyInitial}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Dërguar nga</p>
                  <p className="font-semibold">{companyName}</p>
                  {company?.id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/companies/${company.id}`)}
                      className="mt-1 text-left hover:opacity-80"
                    >
                      <CompanyRatingSummary summary={company.rating_summary} compact inverse />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Vlera e ofertës</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{priceLabel}</p>
              <p className="mt-2 text-xs text-gray-400">Sipas kushteve të përcaktuara në ofertë</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <main className="space-y-6">
          <section className="premium-card p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-label">Përmbledhje</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">Detajet kryesore</h2>
              </div>
              <ShieldCheck className="text-emerald-600" size={26} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailCard label="Çmimi" value={priceLabel} icon={Euro} featured />
              <DetailCard label="Fillimi" value={formatDate(version.can_start_from)} icon={CalendarDays} />
              <DetailCard label="Kohëzgjatja" value={version.duration_text} icon={Clock3} />
            </div>
          </section>

          {version.presentation_text && (
            <section className="premium-card p-5 sm:p-7">
              <p className="text-label">Mesazh nga kompania</p>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-gray-700">
                {version.presentation_text}
              </p>
            </section>
          )}

          <section className="premium-card p-5 sm:p-7">
            <div className="mb-5">
              <p className="text-label">Përmbajtja</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">Çfarë përmban oferta</h2>
            </div>
            <div className="space-y-3">
              <TextBlock title="Çfarë përfshihet" text={version.includes_text} tone="positive" />
              <TextBlock title="Çfarë nuk përfshihet" text={version.excludes_text} />
              <TextBlock title="Kushtet e pagesës" text={version.payment_terms} />
              {!version.includes_text && !version.excludes_text && !version.payment_terms && (
                <p className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                  Kompania nuk ka shtuar detaje të tjera për këtë ofertë.
                </p>
              )}
            </div>
            <button
              onClick={handleDownloadPDF}
              className="premium-btn btn-light mt-5 inline-flex w-full items-center gap-2 sm:w-auto"
            >
              <Download size={17} />
              Shkarko ofertën si PDF
            </button>
          </section>

          {offer.status === "accepted" && (
            <section className="premium-card overflow-hidden">
              {review ? (
                <div className="p-5 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-label">Vlerësimi juaj</p>
                      <h2 className="mt-1 text-xl font-semibold text-gray-900">Faleminderit për vlerësimin</h2>
                      <div className="mt-3 flex items-center gap-1" aria-label={`${review.rating} nga 5 yje`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={20} className={star <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                        ))}
                      </div>
                      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-600">{review.review_text}</p>
                      {review.recommended && (
                        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                          <ThumbsUp size={14} /> Ju e rekomandoni këtë kompani
                        </span>
                      )}
                      {review.image_url && (
                        <img src={review.image_url} alt="Puna e përfunduar" className="mt-5 max-h-72 w-full rounded-2xl object-cover" />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="p-5 sm:p-7">
                  <p className="text-label">Puna e përfunduar</p>
                  <h2 className="mt-1 text-xl font-semibold text-gray-900">Si ishte përvoja juaj?</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Vlerësimi juaj ndihmon klientët e tjerë të zgjedhin kompaninë e duhur.
                  </p>

                  <fieldset className="mt-6">
                    <legend className="text-sm font-semibold text-gray-800">Vlerësimi i përgjithshëm</legend>
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setReviewHover(star)}
                          onMouseLeave={() => setReviewHover(0)}
                          onFocus={() => setReviewHover(star)}
                          onBlur={() => setReviewHover(0)}
                          onClick={() => setReviewRating(star)}
                          className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          aria-label={`${star} yje`}
                        >
                          <Star
                            size={32}
                            className={star <= (reviewHover || reviewRating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
                          />
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="mt-5 block text-sm font-semibold text-gray-800" htmlFor="review-text">
                    Recensioni juaj
                  </label>
                  <textarea
                    id="review-text"
                    rows={5}
                    maxLength={2000}
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    placeholder="Tregoni si shkoi puna, komunikimi dhe rezultati..."
                    className="premium-input mt-2 resize-y"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">{reviewText.length}/2000</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 transition hover:border-gray-500 hover:bg-gray-50">
                      <ImagePlus className="shrink-0 text-gray-500" size={21} />
                      <span className="min-w-0 truncate">{reviewImage ? reviewImage.name : "Shto foto të punës (opsionale)"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => setReviewImage(event.target.files?.[0] || null)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setRecommended((value) => !value)}
                      aria-pressed={recommended}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition ${
                        recommended ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <ThumbsUp size={21} className={recommended ? "fill-blue-600" : ""} />
                      E rekomandoj këtë kompani
                    </button>
                  </div>

                  <div className="mt-5 flex gap-3 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                    <Lock className="mt-0.5 shrink-0" size={16} />
                    Pas dërgimit të vlerësimit, biseda mbyllet përgjithmonë për të dyja palët. Mesazhet e vjetra mbeten të dukshme.
                  </div>

                  {reviewError && <p className="mt-4 text-sm font-medium text-red-600">{reviewError}</p>}
                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="premium-btn btn-dark mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {reviewLoading ? <Loader2 className="animate-spin" size={17} /> : <Star size={17} />}
                    {reviewLoading ? "Duke dërguar..." : "Dërgo vlerësimin"}
                  </button>
                </form>
              )}
            </section>
          )}

          <section className="premium-card overflow-hidden">
            <div className="border-b border-gray-100 p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white">
                  <MessageCircle size={19} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Komunikimi me kompaninë</h2>
                  <p className="text-xs text-gray-500">{chatLocked ? "Biseda është mbyllur" : "Biseda për këtë ofertë"}</p>
                </div>
              </div>
            </div>

            <div className="max-h-[430px] min-h-[180px] space-y-4 overflow-y-auto bg-gray-50/60 p-5 sm:p-7">
              {messages.length === 0 ? (
                <div className="flex min-h-[130px] flex-col items-center justify-center text-center">
                  <MessageCircle className="text-gray-300" size={30} />
                  <p className="mt-3 text-sm font-medium text-gray-700">Ende nuk ka mesazhe</p>
                  <p className="mt-1 text-xs text-gray-500">Shkruani kompanisë nëse keni pyetje për ofertën.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isCustomer = msg.sender_type === "customer";
                  return (
                    <div key={msg.id} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-md ${
                          isCustomer
                            ? "rounded-br-md bg-gray-900 text-white"
                            : "rounded-bl-md border border-gray-200 bg-white text-gray-800"
                        }`}
                      >
                        <div className={`mb-1 text-xs font-semibold ${isCustomer ? "text-gray-300" : "text-gray-500"}`}>
                          {isCustomer ? "Ju" : msg.sender_name}
                        </div>
                        <p className="whitespace-pre-wrap leading-6">{msg.message}</p>
                        {msg.created_at && (
                          <p className={`mt-1.5 text-[10px] ${isCustomer ? "text-gray-400" : "text-gray-400"}`}>
                            {formatDateTime(msg.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {chatLocked ? (
              <div className="flex items-start gap-3 border-t border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 sm:p-5">
                <Lock className="mt-0.5 shrink-0 text-gray-500" size={18} />
                <div>
                  <p className="font-semibold text-gray-800">Biseda është mbyllur</p>
                  <p className="mt-1 text-xs leading-5">Vlerësimi është dorëzuar dhe nuk mund të dërgohen më mesazhe.</p>
                </div>
              </div>
            ) : (
            <div className="flex gap-2 border-t border-gray-100 bg-white p-4 sm:p-5">
              <input
                type="text"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) handleSendMessage();
                }}
                placeholder="Shkruani mesazhin tuaj..."
                aria-label="Mesazhi juaj"
                className="premium-input flex-1"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendingMessage}
                aria-label="Dërgo mesazhin"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sendingMessage ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              </button>
            </div>
            )}
          </section>
        </main>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="premium-card overflow-hidden">
            <div className="p-6">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusMeta.classes}`}>
                <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
              <h2 className="mt-5 text-lg font-semibold text-gray-900">Vendimi juaj</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">{statusMeta.description}</p>
              <p className="mt-5 text-3xl font-bold tracking-tight text-gray-900">{priceLabel}</p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleAccept}
                  disabled={!canDecide || Boolean(decisionLoading)}
                  className="premium-btn w-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {decisionLoading === "accept" ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {decisionLoading === "accept" ? "Duke pranuar..." : "Prano ofertën"}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={!canDecide || Boolean(decisionLoading)}
                  className="premium-btn w-full border border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {decisionLoading === "reject" ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                  {decisionLoading === "reject" ? "Duke refuzuar..." : "Refuzo ofertën"}
                </button>
              </div>

              {canDecide && (
                <p className="mt-4 text-center text-xs leading-5 text-gray-400">
                  Lexoni të gjitha detajet para se të merrni vendimin.
                </p>
              )}
            </div>
          </section>

          <section className="premium-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-800">
                {companyInitial}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Kompania</p>
                <h3 className="truncate font-semibold text-gray-900">{companyName}</h3>
              </div>
            </div>
            <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <Building2 className="shrink-0 text-gray-400" size={17} />
                <span>{companyName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="shrink-0 text-gray-400" size={17} />
                <span className="break-all">{company?.phone || "Nuk është dhënë"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="shrink-0 text-gray-400" size={17} />
                <span className="break-all">{company?.user?.email || "Nuk është dhënë"}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
