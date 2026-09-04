import { useEffect, useState } from "react";
import { CreditCard, FileText, Loader2, ReceiptText } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import paymentService from "../../services/paymentService";

const statusLabels = {
  pending: "Në pritje",
  paid: "E paguar",
  failed: "Dështoi",
  canceled: "E anuluar",
  refunded: "E rimbursuar",
};

const statusStyles = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  paid: "bg-green-50 text-green-800 border-green-200",
  failed: "bg-red-50 text-red-800 border-red-200",
  canceled: "bg-gray-100 text-gray-700 border-gray-200",
  refunded: "bg-blue-50 text-blue-800 border-blue-200",
};

const typeLabels = {
  unlock_lead: "Hapja e kontaktit",
  unlock_chat: "Hapja e bisedës",
  job_payment: "Pagesa e punës",
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PaymentHistory() {
  const { access } = useAuth();
  const [payments, setPayments] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiptLoading, setReceiptLoading] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!access) return;
    let active = true;

    paymentService.getHistory()
      .then((response) => {
        if (active) setPayments(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (active) setError("Historiku i pagesave nuk mund të ngarkohej.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [access]);

  const showReceipt = async (paymentId) => {
    setReceiptLoading(paymentId);
    setError("");
    try {
      const response = await paymentService.getReceipt(paymentId);
      setReceipt(response.data);
    } catch {
      setError("Konfirmimi nuk mund të ngarkohej.");
    } finally {
      setReceiptLoading(null);
    }
  };

  return (
    <div className="premium-container">
      <section className="premium-section">
        <p className="text-label">Financat</p>
        <h1 className="page-title mt-1">Pagesat dhe konfirmimet</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Shikoni statusin, shumën dhe konfirmimin për çdo pagesë.
        </p>
      </section>

      {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <section className="premium-section mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="animate-spin" size={18} /> Duke ngarkuar…</div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center">
            <CreditCard className="mx-auto text-gray-300" size={38} />
            <h2 className="mt-3 font-semibold text-gray-900">Nuk ka pagesa ende</h2>
            <p className="mt-1 text-sm text-gray-500">Pagesat tuaja do të shfaqen këtu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <article key={payment.id} className="premium-card p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-[#17643f]" />
                      <h2 className="truncate font-semibold text-gray-900">{payment.job_title || `Pagesa #${payment.id}`}</h2>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{formatDate(payment.created_at)} · {payment.provider_display}</p>
                    <p className="mt-1 text-xs text-gray-500">{typeLabels[payment.type] || payment.type_display}</p>
                    {payment.status === "paid" && <p className="mt-1 text-xs text-gray-400">{payment.receipt_number}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <strong className="text-lg">{payment.amount} {payment.currency}</strong>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[payment.status] || statusStyles.canceled}`}>
                      {statusLabels[payment.status] || payment.status_display}
                    </span>
                    {payment.status === "paid" && (
                      <button type="button" onClick={() => showReceipt(payment.id)} disabled={receiptLoading === payment.id} className="premium-btn btn-light inline-flex min-h-[44px] items-center gap-2">
                        {receiptLoading === payment.id ? <Loader2 className="animate-spin" size={17} /> : <ReceiptText size={17} />}
                        Shiko konfirmimin
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {receipt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label">Konfirmim pagese</p>
                <h2 id="receipt-title" className="mt-1 text-xl font-semibold">{receipt.receipt_number}</h2>
              </div>
              <button type="button" onClick={() => setReceipt(null)} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100" aria-label="Mbyll">×</button>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">Përshkrimi</dt><dd className="text-right font-medium">{receipt.job_title}</dd>
              <dt className="text-gray-500">Shuma</dt><dd className="text-right font-semibold">{receipt.amount} {receipt.currency}</dd>
              <dt className="text-gray-500">Metoda</dt><dd className="text-right">{receipt.provider_display}</dd>
              <dt className="text-gray-500">Paguar më</dt><dd className="text-right">{formatDate(receipt.paid_at)}</dd>
              <dt className="text-gray-500">Statusi</dt><dd className="text-right">{statusLabels[receipt.status]}</dd>
            </dl>
            <button type="button" onClick={() => setReceipt(null)} className="premium-btn btn-dark mt-6 w-full">Mbyll</button>
          </section>
        </div>
      )}
    </div>
  );
}
