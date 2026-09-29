import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { billingService, isNativeBilling } from "../../services/billingService";
import { openPaymentUrl } from "../../platform/mobile";

const errorText = (e) => e.response?.data?.detail || "Nuk mund të ngarkohen të dhënat e pagesës. Provoni përsëri.";
const statusLabel = (s) => ({ paid: "Paguar", pending: "Në pritje", failed: "Dështoi", canceled: "Anuluar", refunded: "Rimbursuar" }[s] || s);
const date = (v) => v ? new Date(v).toLocaleDateString("sq-AL") : "Pas pagesës së parë";

export function ListingPrice() {
  const [price, setPrice] = useState(null);
  useEffect(() => { let live = true; billingService.catalog().then(r => { if (live) setPrice(r.data.listing); }).catch(() => {}); return () => { live = false; }; }, []);
  return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
    <strong>Tarifa e publikimit</strong>
    {price ? <>
      <p>Çmimi i planifikuar: {price.regular_price} € për kërkesë.</p>
      {price.introductory_free && <p>Ofertë hyrëse: zbritje {price.discount} €.</p>}
      <p className="mt-1 font-semibold">Për të paguar tani: {price.payable} €</p>
    </> : <p>Çmimi po ngarkohet…</p>}
  </div>;
}

export function OfferBilling({ offerId, acceptedOffer = false }) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { const r = await billingService.offerQuote(offerId); setQuote(r.data); setError(""); }
    catch (e) { setError(errorText(e)); }
  }, [offerId]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 10000); return () => clearInterval(timer); }, [refresh]);
  const pay = async () => {
    setBusy(true); setError("");
    try {
      const r = await billingService.offerCheckout(offerId);
      if (r.data.payment_url) await openPaymentUrl(r.data.payment_url, window.location.pathname + (acceptedOffer ? "?payment=return" : "?step=5&payment=return"));
      else await refresh();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm" aria-label="Tarifa e ofertës">
    <h3 className="font-semibold">Tarifa për dërgimin e ofertës</h3>
    <p>Tarifa paguhet për dërgimin dhe kontaktin, jo për pranimin nga klienti. Edhe kur klienti refuzon një ndryshim, tarifa e dërgimit nuk kthehet.</p>
    <p>Rritjet nën 100 € gjithsej nga çmimi i fundit i tarifuar nuk japin tarifë shtesë. Në 100 € ose më shumë, paguhet vetëm diferenca e tarifës. Ndarja në ndryshime të vogla nuk e rinis pragun.</p>
    <p>Pagesa për ofertë: 2,95–19,95 €. Shuma e saktë shfaqet përpara pagesës.</p>
    <details className="mt-2"><summary className="cursor-pointer underline">Si llogaritet tarifa?</summary><p>1% e çmimit të ofertuar, rrumbullakosur lart në shumën që mbaron me ,95 €, me minimum 2,95 € dhe maksimum 19,95 €. Nëse rritni çmimin e një oferte të paguar veçmas, paguani vetëm diferencën e papaguar përpara ridërgimit. Ulja e çmimit nuk krijon rimbursim automatik.</p></details>
    {!acceptedOffer && <p className="mt-2">Vendi rezervohet kur nis pagesa bankare dhe ruhet gjatë verifikimit. Nëse pagesa mbetet në pritje, kontaktoni mbështetjen; mos nisni një pagesë tjetër.</p>}
    {quote?.adjustment && <p className="mt-2 font-semibold">Tarifa e re: {quote.total_fee} € · Paguar më parë: {quote.already_paid} € · Diferenca për të paguar: {quote.fee} €</p>}
    {quote && <p className="my-2 font-semibold">{quote.paid ? (acceptedOffer ? "Tarifa për çmimin e raportuar është përfunduar." : "Tarifa është paguar. Mund të nënshkruani dhe dërgoni.") : quote.legacy ? "Ofertë ekzistuese — pa tarifë të re." : quote.credit_available ? `Përdoret një kredit oferte (${quote.credits_remaining} të mbetura).` : quote.introductory ? `Pa pagesë — ${quote.free_offers_remaining} nga 25 ofertat hyrëse të mbetura. Një ofertë përdoret vetëm kur e dërgoni.` : quote.included ? `Përfshihet në abonim (${quote.remaining} oferta të mbetura këtë muaj).` : `Tarifa: ${quote.fee} €`}</p>}
    {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
    {quote && !quote.paid && !quote.included && !quote.legacy && !quote.introductory && !quote.credit_available && (isNativeBilling() ?
      <p>Blerjet në aplikacion nuk janë aktivizuar ende.</p> : quote.bank_payments_available === false ?
      <p role="status">Pagesat bankare nuk janë aktivizuar ende. Nuk mund të dërgoni oferta me pagesë për momentin.</p> :
      <button type="button" disabled={busy} onClick={pay} className="premium-btn btn-dark mt-2">{busy ? "Duke hapur…" : `Paguaj ${quote.fee} €`}</button>)}
    {!acceptedOffer && <p className="mt-2">Biseda dhe kontaktet hapen pasi dërgoni ofertën dhe tarifa paguhet ose përfshihet në ofertat falas, kredit apo abonim. Nëse kërkohet pagesë, përfundojeni përpara dërgimit.</p>}
    <button type="button" onClick={refresh} className="underline mt-2 mr-4">Përditëso statusin</button>
    {!isNativeBilling() && <Link to="/company/payments" className="underline">Shiko abonimet</Link>}
  </section>;
}

export function SubscriptionBilling() {
  const [catalog, setCatalog] = useState(null);
  const [sub, setSub] = useState(null);
  const [freeOffers, setFreeOffers] = useState(null);
  const [overview, setOverview] = useState(null);
  const [charges, setCharges] = useState([]);
  const [accepted, setAccepted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [terms, setTerms] = useState(null);
  const [signer, setSigner] = useState("");
  const [agreements, setAgreements] = useState([]);
  const [credits, setCredits] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [a, b, c, d] = await Promise.all([billingService.catalog(), billingService.subscription(), billingService.history(), billingService.credits()]);
      setCredits(d.data); setOverview(b.data.overview || null);
      setCatalog(a.data); setAgreements(b.data.agreements || []); setFreeOffers(b.data.free_offers_remaining); setSub(b.data.subscription); setCharges(c.data); setError("");
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const run = async (action) => {
    setBusy(true); setError("");
    try {
      const r = await action();
      if (r.data.payment_url) await openPaymentUrl(r.data.payment_url, "/company/payments?payment=return");
      else await refresh();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const selectPlan = async (plan) => {
    setBusy(true); setError(""); setAccepted(false); setTerms(null); setSelectedPlan(plan);
    try { setTerms((await billingService.terms(plan.code)).data); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const active = sub && (!sub.ends_at || new Date(sub.ends_at) > new Date());
  const unpaidSubscriptions = charges.filter(c => c.kind === "subscription" && c.payable);
  return <section className="premium-section mt-4 space-y-4">
    <h2 className="text-xl font-semibold">Ofertat dhe abonimi</h2>
    {catalog?.bank_payments_available === false && <p role="status" className="rounded-xl bg-amber-50 p-4">Pagesat bankare dhe abonimet nuk janë aktivizuar ende. Mund të përdorni ofertat hyrëse falas dhe kreditet e disponueshme.</p>}
    {overview && <div className="space-y-3" aria-label="Përmbledhja e pagesave">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4"><p>Oferta hyrëse falas</p><strong className="text-2xl">{overview.free_offers_remaining}</strong><p className="text-sm">Nga 25, pa rinovim mujor.</p></div>
        <div className="rounded-xl border p-4"><p>Kredite kompensimi</p><strong className="text-2xl">{overview.credits_remaining}</strong><p className="text-sm">Për kërkesa të tjera, pa afat skadimi.</p></div>
        <div className="rounded-xl border p-4"><p>Oferta nga abonimi të disponueshme</p><strong className="text-2xl">{overview.monthly_offers_remaining} / {overview.monthly_offers_total}</strong>{overview.period_ends_at && <p className="text-sm">Periudha deri më {date(overview.period_ends_at)}</p>}</div>
      </div>
      {overview.next_payment_amount && <p className="rounded-xl bg-blue-50 p-4">Pagesa e radhës: <strong>{overview.next_payment_amount} €</strong> · {overview.next_payment_due_at ? date(overview.next_payment_due_at) : "Për fillimin e abonimit"}. Pagesë manuale në bankë.</p>}
      {Number(overview.outstanding_amount) > 0 && <p role="status" className="rounded-xl bg-amber-50 p-4">Pagesa mujore të papaguara: {overview.outstanding_amount} €. Kontrolloni listën më poshtë. Kuota e abonimit kërkon pagesat e periudhave përkatëse.</p>}
      {overview.ends_at && <p>Data e përfundimit të abonimit: <strong>{date(overview.ends_at)}</strong>.</p>}
      {overview.state === "none" && <p>Nuk keni abonim. Mund të paguani për çdo ofertë.</p>}
      <p className="text-sm">Përdorimi: kredit i përshtatshëm → ofertat hyrëse falas → kuota e paguar e abonimit → pagesë për ofertë.</p>
    </div>}

    <p className="rounded-xl bg-blue-50 p-4">Kredite ofertash: {credits.filter(c => !c.redeemed_offer_id).length}. Përdoren të parat për një kërkesë tjetër, nuk skadojnë dhe mbeten edhe pas anulimit të abonimit.</p>
    {credits.length > 0 && <details><summary>Historiku i krediteve</summary>{credits.map(c => <p key={c.id}>Oferta #{c.source_offer_id} · {c.reason} · {c.redeemed_offer_id ? `Përdorur për ofertën #${c.redeemed_offer_id}` : "I disponueshëm"}</p>)}</details>}
    {freeOffers != null && <p className="rounded-xl bg-emerald-50 p-4 font-semibold">{freeOffers} nga 25 ofertat falas të mbetura. Përdoren pas krediteve të përshtatshme, vetëm kur dërgoni ofertën; nuk rinovohen çdo muaj.</p>}
    {freeOffers > 0 && <p className="text-sm">Mund të prisni derisa të mbarojnë ofertat falas përpara se të nisni abonimin. Nëse abonoheni tani, periudha mujore fillon me pagesën e parë edhe nëse keni oferta falas.</p>}
    <p className="text-sm">Pa abonim: 2,95–19,95 € për ofertë. Shuma e saktë shfaqet përpara pagesës. Për oferta me çmime të ulëta, pagesa për ofertë mund të jetë më e lirë se abonimi.</p>
    <details className="text-sm"><summary className="cursor-pointer underline">Rregulli i llogaritjes</summary><p>1% e çmimit të ofertuar, rrumbullakosur lart në ,95 €, me minimum 2,95 € dhe maksimum 19,95 €. Rritja e çmimit të një oferte të paguar veçmas kërkon vetëm diferencën e tarifës.</p></details>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {active ? <div className="rounded-xl border p-4 space-y-2">
      <p className="font-semibold">{sub.monthly_price} €/muaj · {sub.monthly_offers} oferta/muaj</p>
      <p>Fillimi: {date(sub.started_at)}</p>
      {sub.ends_at ? <p>U kërkua anulimi. Abonimi dhe pagesat vazhdojnë deri më {date(sub.ends_at)}.</p> : <>
        <button className="underline" disabled={busy} onClick={() => setCancelConfirm(true)}>Kërko anulimin</button>
        {cancelConfirm && <div role="alert"><p>Pagesat vazhdojnë për të paktën 3 muaj, deri në fund të periudhës mujore përkatëse.</p><button disabled={busy} className="premium-btn btn-dark" onClick={() => run(billingService.cancel)}>Konfirmo anulimin</button><button className="premium-btn btn-light" onClick={() => setCancelConfirm(false)}>Kthehu</button></div>}
      </>}
      {sub.periods.map(p => <div key={p.id} className="border-t pt-2 text-sm">
        {date(p.starts_at)} – {date(p.ends_at)} · {p.offers_used}/{sub.monthly_offers} oferta të përdorura · {p.charge.status === "paid" ? "Paguar" : "Në pritje të pagesës"}

      </div>)}
    </div> : <>
      <p className="text-sm">Ofertat rinovohen çdo muaj dhe nuk barten. Ofertat shtesë paguhen sipas tarifës për ofertë. Afati i njoftimit për anulim është të paktën 3 muaj; përfundimi bëhet në fund të periudhës përkatëse.</p>
      {selectedPlan && terms && <div className="rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold">Lexoni dhe nënshkruani marrëveshjen</h3>
        <pre className="whitespace-pre-wrap font-sans text-sm">{terms.text}</pre>
        <label className="block">Emri i plotë i përfaqësuesit<input value={signer} maxLength={200} onChange={e => setSigner(e.target.value)} className="block border rounded p-2 w-full" /></label>
        <label className="flex gap-2"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />Jam i autorizuar dhe pranoj këtë marrëveshje dhe pagesat gjatë afatit të njoftimit.</label>
        <button disabled={busy || catalog?.bank_payments_available === false || !accepted || signer.trim().length < 2} className="premium-btn btn-dark disabled:opacity-50" onClick={() => run(() => billingService.subscribe(selectedPlan.code, signer.trim(), terms.version))}>Nënshkruaj dhe vazhdo te pagesa</button>
      </div>}
      <div className="grid gap-3 sm:grid-cols-3">{catalog?.plans.map(plan => <article key={plan.code} className="rounded-xl border p-4">
        <h3 className="font-semibold">{plan.offers} oferta/muaj</h3><p className="text-xl my-2">{plan.monthly_price} €</p>
        <p className="text-sm">Veçmas për {plan.offers} oferta: {(plan.offers * 2.95).toFixed(2)}–{(plan.offers * 19.95).toFixed(2)} €.</p>
        <p className="text-sm mb-2">Abonimi: {(Number(plan.monthly_price) / plan.offers).toFixed(2)} € për ofertë nëse përdorni të gjitha. Pagesa veçmas mund të jetë më e lirë.</p>
        {!isNativeBilling() && <button disabled={busy || catalog?.bank_payments_available === false} className="premium-btn btn-dark disabled:opacity-50" onClick={() => selectPlan(plan)}>Zgjidh planin</button>}
      </article>)}</div>
      {isNativeBilling() && <p>Blerjet në aplikacion nuk janë aktivizuar ende.</p>}
    </>}
    <button onClick={refresh} disabled={busy} className="underline">Përditëso pagesat</button>
    <h3 className="font-semibold">Pagesa mujore të papaguara</h3>
    <p className="text-sm">Pagesa mujore kryhet manualisht. Nuk bëhet tërheqje automatike nga karta.</p>
    {unpaidSubscriptions.length === 0 && <p>Nuk ka pagesa mujore të papaguara.</p>}
    {unpaidSubscriptions.map(c => <div key={c.id} className="border rounded p-3">
      <p>Abonimi #{c.subscription_id} · {date(c.period_starts_at)} – {date(c.period_ends_at)} · {c.amount} €</p>
      {!isNativeBilling() && <button disabled={busy || catalog?.bank_payments_available === false} className="premium-btn btn-dark" onClick={() => run(() => billingService.checkout(c.id))}>Paguaj {c.amount} €</button>}
    </div>)}
    <h3 className="font-semibold">Marrëveshjet e mia</h3>
    {agreements.map(a => <details key={a.subscription_id} className="border rounded p-3"><summary>Marrëveshja #{a.subscription_id} · {date(a.signed_at)}</summary>
      <p>Nënshkruar nga: {a.signer_name} · {new Date(a.signed_at).toLocaleString("sq-AL")}</p>
      <pre className="whitespace-pre-wrap font-sans text-sm">{a.text}</pre>
      <a className="underline" download={`marreveshja-${a.subscription_id}.txt`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${a.text}\nNënshkruar: ${a.signer_name}\nData: ${a.signed_at}\nSHA-256: ${a.sha256}`)}`}>Shkarko kopjen</a>
    </details>)}
    <h3 className="font-semibold">Pagesat e platformës</h3>
    {charges.length === 0 && <p className="text-sm">Nuk ka pagesa ende.</p>}
    {charges.map(c => <div className="border-t py-3 text-sm" key={c.id}>
      <strong>{c.type_display} · {c.amount} €</strong> · {statusLabel(c.status)}
      {c.receipt_number && <p>Konfirmimi: {c.receipt_number} · {date(c.paid_at)}</p>}
    </div>)}
  </section>;
}

export function PublicationBilling({ jobId }) {
  const [charge, setCharge] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => billingService.history().then(r => { setCharge(r.data.find(c => c.job_request_id === Number(jobId))); }).catch(e => setError(errorText(e))), [jobId]);
  useEffect(() => { refresh(); }, [refresh]);
  const pay = async () => {
    setBusy(true);
    try { const r = await billingService.checkout(charge.id); if (r.data.payment_url) await openPaymentUrl(r.data.payment_url, window.location.pathname + "?payment=return"); else await refresh(); }
    catch(e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  if (!charge && !error) return null;
  return <section className="premium-card p-4 my-4 text-sm">
    <h2 className="font-semibold">Publikimi i kërkesës</h2>
    {charge && <><p>Çmimi: {charge.regular_amount} € · Zbritja: {charge.discount_amount} € · Shuma: {charge.amount} €</p>
      <p>{charge.status === "paid" ? "Tarifa e publikimit është përfunduar." : "Publikimi pret pagesën dhe shqyrtimin."}</p>
      {charge.status !== "paid" && (isNativeBilling() ? <p>Blerjet në aplikacion nuk janë aktivizuar ende.</p> : <button className="premium-btn btn-dark" disabled={busy} onClick={pay}>Paguaj {charge.amount} €</button>)}</>}
    {error && <p role="alert">{error}</p>}<button className="underline mt-2" onClick={refresh}>Përditëso statusin</button>
  </section>;
}


export function CustomerBillingHistory() {
  const [charges, setCharges] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    billingService.history().then(r => { if (live) setCharges(r.data); }).catch(e => { if (live) setError(errorText(e)); });
    return () => { live = false; };
  }, []);
  return <section className="premium-section mt-4 space-y-3">
    <h2 className="font-semibold">Pagesat e publikimit</h2>
    {error && <p role="alert">{error}</p>}
    {charges.map(c => <article key={c.id} className="border-t py-3 text-sm">
      <strong>{c.type_display} · {c.amount} € · {statusLabel(c.status)}</strong>
      <p>Çmimi: {c.regular_amount} € · Zbritja: {c.discount_amount} €</p>
      {c.receipt_number && <p>Konfirmimi: {c.receipt_number} · {date(c.paid_at)}</p>}
      {c.job_request_id && <Link to={`/customer/jobrequests/${c.job_request_id}`} className="underline">Shiko kërkesën dhe pagesën</Link>}
    </article>)}
  </section>;
}
