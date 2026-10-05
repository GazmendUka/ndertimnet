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

export function PricingPlans({ catalog, onSelect, disabled = false }) {
  return <div className="grid gap-4 sm:grid-cols-2">{catalog?.plans.map(plan => <article key={plan.code} className="rounded-xl border p-5">
    <h3 className="text-xl font-semibold">{plan.name}</h3>
    <p className="my-3 text-3xl font-semibold">{plan.monthly_price} €<span className="text-sm font-normal"> / muaj</span></p>
    {Number(plan.monthly_price) < Number(plan.regular_price) && <p>Çmim hyrës deri më 31 dhjetor 2026. Çmimi i rregullt: {plan.regular_price} €/muaj nga rinovimi i parë më ose pas 1 janarit 2027, edhe për abonentët ekzistues.</p>}
    <p className="mt-3 font-semibold">{plan.offers} oferta në muaj</p>
    <p>Pa afat detyrues. Pa pagesë për lead ose ofertë.</p>
    <p className="text-sm mt-2">Ofertat e papërdorura nuk barten. Kontaktet dhe biseda hapen pasi dërgoni ofertën.</p>
    {onSelect === null ? null : onSelect ? <button type="button" disabled={disabled} onClick={() => onSelect(plan)} className="premium-btn btn-dark mt-4 disabled:opacity-50">Zgjidh {plan.name}</button> : <Link className="premium-btn btn-dark mt-4" to="/register/company">Regjistro kompaninë</Link>}
  </article>)}</div>;
}

export function PublicSubscriptionPricing() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    billingService.catalog().then(r => { if (live) setCatalog(r.data); }).catch(() => { if (live) setError("Çmimet nuk mund të ngarkohen. Provoni përsëri."); });
    return () => { live = false; };
  }, []);
  return <section className="premium-section space-y-4"><h2 className="text-2xl font-semibold">Abonimet për kompanitë</h2>
    {error ? <p role="alert">{error}</p> : catalog ? <PricingPlans catalog={catalog} /> : <p>Çmimet po ngarkohen…</p>}
    <p className="text-sm">Pagesa mujore kryhet manualisht në faqen e bankës. Anulimi hyn në fuqi në fund të periudhës aktuale.</p>
    {catalog?.bank_payments_available === false && <p role="status">Aktivizimi i pagesave bankare është në përgatitje.</p>}
  </section>;
}

export function OfferBilling({ offerId }) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { setQuote((await billingService.offerQuote(offerId)).data); setError(""); }
    catch (e) { setError(errorText(e)); }
  }, [offerId]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 10000); return () => clearInterval(timer); }, [refresh]);
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm" aria-label="Kuota e ofertës">
    <h3 className="font-semibold">Dërgimi i ofertës</h3>
    <p>Nuk ka pagesë për ofertë, lead ose bisedë. Rishikimet e një oferte të dërguar nuk konsumojnë kuotë tjetër.</p>
    {quote && <p className="my-2 font-semibold">{quote.pending ? "Pagesa e mëparshme po verifikohet. Kontaktoni mbështetjen nëse vonesa vazhdon." : quote.paid || quote.legacy ? "Kjo ofertë është e përfshirë. Mund të nënshkruani dhe dërgoni." : quote.credit_available ? `Përdoret një kredit (${quote.credits_remaining} të mbetura).` : quote.introductory ? `Ju kanë mbetur ${quote.free_offers_remaining} oferta falas të dhëna më parë.` : quote.included ? `Përfshihet në abonim: ${quote.remaining} oferta të mbetura këtë periudhë.` : "Zgjidhni një abonim ose prisni rinovimin e kuotës."}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <p className="mt-2">Kontaktet dhe biseda hapen pasi nënshkruani dhe dërgoni ofertën.</p>
    <button type="button" onClick={refresh} className="underline mt-2 mr-4">Përditëso statusin</button>
    {!isNativeBilling() && <Link to="/company/payments" className="underline">Shiko abonimet</Link>}
  </section>;
}

export function SubscriptionBilling() {
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [charges, setCharges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [terms, setTerms] = useState(null);
  const [signer, setSigner] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([billingService.catalog(), billingService.subscription(), billingService.history()]);
      setCatalog(a.data); setData(b.data); setCharges(c.data); setError("");
    } catch (e) { setError(errorText(e)); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const run = async action => {
    setBusy(true); setError("");
    try {
      const result = await action();
      if (result.data.payment_url) await openPaymentUrl(result.data.payment_url, "/company/payments?payment=return");
      else { setSelected(null); setConfirmCancel(false); await refresh(); }
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const select = async plan => {
    setBusy(true); setError(""); setSelected(plan); setTerms(null); setAccepted(false);
    try { setTerms((await billingService.terms(plan.code)).data); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const sub = data?.subscription;
  const overview = data?.overview;
  const active = sub && (!sub.ends_at || new Date(sub.ends_at) > new Date());
  const changing = active && sub.started_at && !sub.canceled_at;
  return <section className="premium-section mt-4 space-y-4">
    <h2 className="text-xl font-semibold">Ofertat dhe abonimi</h2>
    {catalog?.bank_payments_available === false && <p role="status">Pagesat bankare nuk janë aktivizuar ende. Kreditet dhe ofertat falas të dhëna më parë ruhen.</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {overview && <div aria-label="Përmbledhja e pagesave" className="space-y-2">
      <p>Kuota e disponueshme: <strong>{overview.monthly_offers_remaining} / {overview.monthly_offers_total}</strong>{overview.period_ends_at && ` · Deri më ${date(overview.period_ends_at)}`}</p>
      {overview.free_offers_remaining > 0 && <p>Oferta falas të dhëna më parë: {overview.free_offers_remaining}. Pa rinovim mujor.</p>}
      <p>Kredite kompensimi: {overview.credits_remaining}. Përdoren përpara ofertave falas dhe kuotës.</p>
      {overview.next_payment_amount && <p>Pagesa e radhës: <strong>{overview.next_payment_amount} €</strong> · {date(overview.next_payment_due_at)}. Pagesë manuale në bankë.</p>}
      {Number(overview.outstanding_amount) > 0 && <p role="status">Pagesa të papaguara: {overview.outstanding_amount} €. Kuota kërkon shlyerjen e periudhave të kaluara.</p>}
    </div>}
    {active && <div className="rounded-xl border p-4 space-y-2">
      <p className="font-semibold">{catalog?.plans.find(p => p.code === sub.plan_code)?.name || sub.plan_code} · {sub.monthly_offers} oferta/muaj</p>
      {sub.pending_plan_code && <p>Ndryshimi në {sub.pending_plan_code === "pro" ? "Pro" : "Standard"} hyn në fuqi më {date(sub.pending_plan_at)}.</p>}
      {sub.ends_at ? <p>Abonimi përfundon më {date(sub.ends_at)}. Nuk rinovohet pas kësaj date.</p> : <>
        <button type="button" disabled={busy} className="underline" onClick={() => setConfirmCancel(true)}>Anulo abonimin</button>
        {confirmCancel && <div><p>Abonimi përfundon në fund të periudhës aktuale. Pa afat detyrues.</p><button disabled={busy} onClick={() => run(billingService.cancel)} className="premium-btn btn-dark">Konfirmo anulimin</button><button onClick={() => setConfirmCancel(false)} className="premium-btn btn-light">Kthehu</button></div>}
      </>}
      {sub.periods.map(p => <p key={p.id}>{date(p.starts_at)} – {date(p.ends_at)} · {p.offers_used}/{p.monthly_offers} oferta · {statusLabel(p.charge.status)} · {p.charge.amount} €</p>)}
    </div>}
    <p>Pa afat detyrues. Pa pagesë për lead ose ofertë. Ofertat rinovohen çdo muaj dhe nuk barten.</p>
    {changing && <p>Ndryshimi i planit zbatohet në periudhën tjetër. Kuota dhe çmimi i periudhës aktuale ruhen.</p>}
    {(!active || changing) && <PricingPlans catalog={catalog} onSelect={isNativeBilling() ? null : select} disabled={busy || (!changing && catalog?.bank_payments_available === false)} />}
    {isNativeBilling() && <p>Blerjet në aplikacion nuk janë aktivizuar ende.</p>}
    {selected && terms && <div className="rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold">Lexoni dhe nënshkruani marrëveshjen për {selected.name}</h3>
      <pre className="whitespace-pre-wrap font-sans text-sm">{terms.text}</pre>
      <label className="block">Emri i plotë i përfaqësuesit<input value={signer} maxLength={200} onChange={e => setSigner(e.target.value)} className="block border rounded p-2 w-full" /></label>
      <label className="flex gap-2"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />Jam i autorizuar dhe pranoj marrëveshjen e abonimit.</label>
      <button disabled={busy || !accepted || signer.trim().length < 2} className="premium-btn btn-dark" onClick={() => run(() => changing ? billingService.changePlan(selected.code, signer.trim(), terms.version) : billingService.subscribe(selected.code, signer.trim(), terms.version))}>{changing ? "Konfirmo ndryshimin për periudhën tjetër" : "Nënshkruaj dhe vazhdo te pagesa"}</button>
    </div>}
    <button onClick={refresh} disabled={busy} className="underline">Përditëso pagesat</button>
    <h3 className="font-semibold">Pagesa mujore të papaguara</h3>
    <p>Pagesa mujore kryhet manualisht. Nuk bëhet tërheqje automatike nga karta.</p>
    {charges.filter(c => c.kind === "subscription" && c.payable).map(c => <div key={c.id} className="border rounded p-3"><p>{date(c.period_starts_at)} – {date(c.period_ends_at)} · {c.amount} €</p>{!isNativeBilling() && <button disabled={busy || catalog?.bank_payments_available === false} className="premium-btn btn-dark" onClick={() => run(() => billingService.checkout(c.id))}>Paguaj {c.amount} €</button>}</div>)}
    <h3 className="font-semibold">Marrëveshjet e mia</h3>
    {[...(data?.agreements || []), ...(data?.plan_changes || [])].map((a, i) => <details key={i}><summary>Marrëveshja · {date(a.signed_at)}</summary><p>Nënshkruar nga {a.signer_name}</p><pre className="whitespace-pre-wrap font-sans text-sm">{a.text}</pre><a className="underline" download={`marreveshja-${i}.txt`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${a.text}\nNënshkruar: ${a.signer_name}\nData: ${a.signed_at}\nSHA-256: ${a.sha256}`)}`}>Shkarko kopjen</a></details>)}
    <h3 className="font-semibold">Pagesat e platformës</h3>
    {charges.map(c => <p key={c.id}>{c.type_display} · {c.amount} € · {statusLabel(c.status)} {c.receipt_number && `· ${c.receipt_number}`}</p>)}
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
