import { useCallback, useEffect, useState } from "react";
import { billingService } from "../../services/billingService";
import { OfferAllowanceSummary } from "./CompanyOfferAllowance";

const date = value => value ? new Date(value).toLocaleDateString("sq-AL") : "—";
const status = value => ({ paid: "Paguar", pending: "Në pritje", failed: "Dështoi", canceled: "Anuluar", refunded: "Rimbursuar" }[value] || value);

// Existing account entitlements and records only: no catalog, enrollment or checkout.
export default function CompanyOfferBalance() {
  const [data, setData] = useState(null);
  const [charges, setCharges] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try {
      // Reconcile the account before showing balances changed outside this app.
      await billingService.refreshStatus();
      const [account, history] = await Promise.all([billingService.subscription(), billingService.history()]);
      setData(account.data); setCharges(history.data);
    } catch { setError("Kuota nuk mund të ngarkohet. Provoni përsëri."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener("ndertimnet:account-refresh", refresh);
    return () => window.removeEventListener("ndertimnet:account-refresh", refresh);
  }, [refresh]);
  const cancel = async () => {
    setBusy(true); setError("");
    try { await billingService.cancel(); setConfirmCancel(false); await refresh(); }
    catch { setError("Anulimi nuk u krye. Provoni përsëri."); }
    finally { setBusy(false); }
  };
  const overview = data?.overview;
  const sub = data?.subscription;
  const agreements = [...(data?.agreements || []), ...(data?.plan_changes || [])];
  return <section className="premium-section mt-4 space-y-4" aria-label="Kuota e ofertave">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">Ofertat e disponueshme</h2>
      <button type="button" onClick={refresh} disabled={busy} className="text-sm underline">Përditëso statusin</button>
    </div>
    {busy && <p role="status">Duke përditësuar kuotën…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {overview && <div className="space-y-3">
      <p>Ofertat mujore: <strong>{overview.monthly_offers_remaining} / {overview.monthly_offers_total}</strong>{overview.period_ends_at && ` · Deri më ${date(overview.period_ends_at)}`}</p>
      <OfferAllowanceSummary overview={overview} />
      <p>Oferta pa afat skadimi: <strong>{overview.purchased_offers_remaining || 0}</strong></p>
      <p>Kredite kompensimi: <strong>{overview.credits_remaining || 0}</strong></p>
      <p>Rishikimet e një oferte të dërguar nuk konsumojnë kuotë tjetër.</p>
    </div>}
    {sub && <div className="rounded-xl border p-4 space-y-2">
      <p className="font-semibold">{({ standard: "Standard", pro: "Pro" })[sub.plan_code] || sub.plan_code} · {sub.monthly_offers} oferta/muaj</p>
      {!sub.started_at && <p>Abonimi nuk është aktiv.</p>}
      {sub.ends_at ? <p>Abonimi përfundon më {date(sub.ends_at)}.</p> : <>
        <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className="underline">Anulo abonimin</button>
        {confirmCancel && <div className="space-y-2">
          <p>Abonimi përfundon në fund të periudhës aktuale.</p>
          <button type="button" disabled={busy} onClick={cancel} className="premium-btn btn-dark">Konfirmo anulimin</button>
          <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className="premium-btn btn-light">Kthehu</button>
        </div>}
      </>}
    </div>}
    {agreements.length > 0 && <details>
      <summary className="cursor-pointer font-semibold">Marrëveshjet e mia</summary>
      {agreements.map((a, i) => <details key={i} className="mt-2">
        <summary>Marrëveshja · {date(a.signed_at)}</summary>
        <p>Nënshkruar nga {a.signer_name}</p>
        <pre className="whitespace-pre-wrap font-sans text-sm">{a.text}</pre>
        <a className="underline" download={`marreveshja-${i}.txt`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${a.text}\nNënshkruar: ${a.signer_name}\nData: ${a.signed_at}\nSHA-256: ${a.sha256}`)}`}>Shkarko kopjen</a>
      </details>)}
    </details>}
    {charges.length > 0 && <details aria-label="Historiku i pagesave">
      <summary className="cursor-pointer font-semibold">Historiku i pagesave ({charges.length})</summary>
      {charges.map(c => <p key={c.id} className="mt-2 text-sm">{date(c.created_at)} · {c.type_display} · {c.amount} € · {status(c.status)}{c.receipt_number && ` · ${c.receipt_number}`}</p>)}
    </details>}
  </section>;
}
