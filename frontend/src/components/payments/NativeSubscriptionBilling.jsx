import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { billingService } from "../../services/billingService";
import { storeBillingService } from "../../services/storeBillingService";
import { OfferAllowanceSummary } from "./CompanyOfferAllowance";

const message = e => e.response?.data?.detail || e.message || "Pagesa nuk mund të përfundohej. Provoni përsëri pa blerë sërish.";
const date = value => value ? new Date(value).toLocaleDateString("sq-AL") : "Pas pagesës";
const status = value => ({ paid: "Paguar", pending: "Në pritje", failed: "Dështoi", canceled: "Anuluar", refunded: "Rimbursuar" }[value] || value);

export default function NativeSubscriptionBilling() {
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [charges, setCharges] = useState([]);
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [terms, setTerms] = useState(null);
  const [signer, setSigner] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const agreementRef = useRef(null);
  const sub = data?.subscription;
  const active = sub && (!sub.ends_at || new Date(sub.ends_at) > new Date());

  const refresh = useCallback(async () => {
    const [a, b, c] = await Promise.all([billingService.catalog(), billingService.subscription(), billingService.history()]);
    setCatalog(a.data); setData(b.data); setCharges(c.data);
  }, []);
  useEffect(() => {
    let live = true;
    let listener;
    let resume;
    (async () => {
      await refresh();
      const { data: settings } = await storeBillingService.config().catch(e => {
        // Older servers support shared balances even before store checkout rolls out.
        if (e.response?.status === 404) return { data: { enabled: false } };
        throw e;
      });
      if (!live) return;
      setConfig(settings);
      if (!settings.enabled) return;
      const items = await storeBillingService.products(settings);
      if (!live) return;
      setProducts(items);
      if (!items.length) setError("Paketat nuk janë ende të disponueshme në dyqan. Mos kryeni pagesë jashtë aplikacionit nga kjo faqe.");
      listener = await storeBillingService.listen(() => { if (live) refresh().catch(e => setError(message(e))); });
      if (!live) { listener.remove(); return; }
      resume = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive && live) storeBillingService.recover().then(refresh).catch(e => { if (live) setError(message(e)); });
      });
      if (!live) resume.remove();
      await storeBillingService.recover();
      if (live) await refresh();
    })().catch(e => { if (live) setError(message(e)); });
    return () => { live = false; listener?.remove(); resume?.remove(); };
  }, [refresh]);
  useEffect(() => {
    if (terms) {
      agreementRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      agreementRef.current?.focus({ preventScroll: true });
    }
  }, [terms]);

  const run = async action => {
    if (busy) return;
    setBusy(true); setError(""); setFeedback("");
    try {
      await action();
      setSelected(null); setTerms(null); setAccepted(false);
      await refresh();
    } catch (e) {
      try { await refresh(); } catch { /* Keep the actionable purchase error. */ }
      setError(message(e));
    } finally { setBusy(false); }
  };
  const select = async (product, chargeId, changing = false) => {
    setBusy(true); setError(""); setFeedback(""); setTerms(null); setAccepted(false);
    setSelected({ product, chargeId, changing });
    try { setTerms((await storeBillingService.terms(product, chargeId)).data); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  const buy = () => run(async () => {
    if (selected.changing) {
      const result = await storeBillingService.changePlan(selected.product, signer.trim(), terms.version);
      setFeedback(result.data.effective_at ? `Ndryshimi i planit hyn në fuqi më ${date(result.data.effective_at)}. Nuk u krye pagesë sot.` : "Ndryshimi i planifikuar u anulua. Plani aktual ruhet.");
    } else {
      await storeBillingService.buy(selected.product, signer.trim(), terms.version, selected.chargeId);
      setFeedback("Pagesa u verifikua. Kuota është përditësuar edhe në faqen e internetit.");
    }
  });
  const options = [...(catalog?.offer_pack ? [{ ...catalog.offer_pack, name: "Bazë", oneTime: true }] : []), ...(catalog?.plans || [])];
  const waiting = charges.filter(c => c.payable && ["subscription", "offer_pack"].includes(c.kind));

  return <section className="premium-section mt-4 space-y-5" aria-label="Blerjet në aplikacion">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">Ofertat dhe abonimi</h2>
      <button type="button" disabled={busy} className="underline disabled:opacity-50" onClick={() => run(async () => {
        if (config?.enabled) await storeBillingService.recover();
        setFeedback("Statusi i blerjeve u përditësua.");
      })}>Përditëso blerjet</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    {feedback && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-900">{feedback}</p>}
    {busy && <p role="status">Blerja po përpunohet. Mos e përsëritni pagesën.</p>}
    {config?.environment === "Sandbox" && <p role="status" className="rounded-lg bg-amber-50 p-3">Pagesa testuese. Përdorni vetëm llogarinë testuese të dyqanit.</p>}
    {data?.overview && <div className="rounded-xl border p-4 space-y-2">
      <OfferAllowanceSummary overview={data.overview} />
      <p>Ofertat e blera pa afat skadimi: <strong>{data.overview.purchased_offers_remaining || 0}</strong></p>
      <p>Kuota mujore: <strong>{data.overview.monthly_offers_remaining} / {data.overview.monthly_offers_total}</strong></p>
      {data.overview.period_ends_at && <p>Deri më {date(data.overview.period_ends_at)}</p>}
      <p>Kredite kompensimi: {data.overview.credits_remaining}</p>
    </div>}
    {active && <div className="rounded-xl border p-4 space-y-2">
      <p className="font-semibold">{sub.plan_code === "pro" ? "Pro" : "Standard"} · {sub.monthly_offers} oferta në muaj</p>
      {!sub.started_at && <p>Abonimi nuk është aktivizuar ende. Përfundoni pagesën në pritje.</p>}
      {sub.pending_plan_code && <p>Plani ndryshon në {sub.pending_plan_code === "pro" ? "Pro" : "Standard"} më {date(sub.pending_plan_at)}.</p>}
      {sub.ends_at ? <p>Abonimi përfundon më {date(sub.ends_at)}.</p> : <details>
        <summary className="cursor-pointer underline">Anulo abonimin</summary>
        <p>Anulimi hyn në fuqi në fund të periudhës së paguar. Ofertat dhe historiku i mëparshëm ruhen.</p>
        <button disabled={busy} className="premium-btn btn-light mt-2" onClick={() => run(async () => {
          await billingService.cancel(); setFeedback("Anulimi u regjistrua.");
        })}>Konfirmo anulimin</button>
      </details>}
    </div>}
    <p>Paketat dhe kuota janë të përbashkëta me faqen e internetit.</p>
    {config?.enabled && <p>Pagesa e çdo muaji konfirmohet manualisht në dyqan; nuk ka debit automatik.</p>}
    {config && !config.enabled && <p role="status">Blerjet në aplikacion nuk janë aktivizuar ende.</p>}
    {config?.enabled && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{options.map(option => {
      const product = products.find(p => p.code === option.code);
      const current = !option.oneTime && active;
      return <article key={option.code} className="rounded-xl border p-5 flex flex-col gap-3">
        <h3 className="text-xl font-semibold">{product?.title || option.name}</h3>
        {product ? <p className="text-3xl font-semibold">{product.priceString}<span className="text-sm font-normal">{option.oneTime ? " · një herë" : " / muaj"}</span></p> : <p className="text-sm">Çmimi ngarkohet nga dyqani.</p>}
        <p className="font-semibold">{option.offers} oferta{option.oneTime ? " pa afat skadimi" : " në muaj"}</p>
        <p className="text-sm flex-1">{option.oneTime ? "Pa abonim. Ofertat mbeten derisa t’i përdorni." : "Ofertat e papërdorura nuk barten. Pa afat detyrues."}</p>
        {current ? <><p className="text-sm">{sub.plan_code === option.code ? "Plani aktual" : "Ndryshimi i planit zbatohet nga periudha tjetër."}</p>
          {product && sub.started_at && !sub.canceled_at && (sub.plan_code !== option.code || sub.pending_plan_code) && <button disabled={busy} onClick={() => select(product, undefined, true)} className="premium-btn btn-light">Ndrysho në {option.name}</button>}
        </> : product && <button disabled={busy} className="premium-btn btn-dark disabled:opacity-50" onClick={() => select(product)}>Zgjidh {option.name}</button>}
      </article>;
    })}</div>}
    {config?.enabled && waiting.length > 0 && <div className="space-y-3"><h3 className="font-semibold">Pagesa në pritje</h3>{waiting.map(charge => {
      const code = charge.kind === "offer_pack" ? "offers_3" : charge.plan_code;
      const product = products.find(p => p.code === code);
      return <div className="rounded-xl border p-4" key={charge.id}>
        <p>{code === "offers_3" ? "Bazë" : code === "pro" ? "Pro" : "Standard"} · {date(charge.period_starts_at)} · {status(charge.status)}</p>
        {product && <button disabled={busy} className="premium-btn btn-dark mt-2" onClick={() => select(product, charge.id)}>Përfundo pagesën · {product.priceString}</button>}
      </div>;
    })}</div>}
    {selected && terms && <div ref={agreementRef} tabIndex={-1} className="rounded-xl border p-4 space-y-3 scroll-mt-24" aria-label="Konfirmimi i blerjes">
      <h3 className="font-semibold">Konfirmoni blerjen · {selected.product.priceString}</h3>
      {selected.changing && <p role="status">Nuk kryhet pagesë sot. Plani dhe kuota aktuale ruhen deri në fund të periudhës; ndryshimi zbatohet pastaj.</p>}
      <pre className="whitespace-pre-wrap font-sans text-sm">{terms.text}</pre>
      <label className="block">Emri i plotë i përfaqësuesit<input className="block w-full rounded border p-2" maxLength={200} value={signer} onChange={e => setSigner(e.target.value)} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />Jam i autorizuar dhe pranoj marrëveshjen.</label>
      <button disabled={busy || !accepted || signer.trim().length < 2} onClick={buy} className="premium-btn btn-dark disabled:opacity-50">Përfundo blerjen · {selected.product.priceString}</button>
      <button disabled={busy} onClick={() => { setSelected(null); setTerms(null); }} className="premium-btn btn-light ml-2">Kthehu</button>
    </div>}
    {data?.agreements?.length > 0 && <details><summary className="cursor-pointer font-semibold">Marrëveshjet e mia</summary>{data.agreements.map((a, i) => <details className="mt-3" key={i}>
      <summary>Marrëveshja · {date(a.signed_at)}</summary><p>Nënshkruar nga {a.signer_name}</p><pre className="whitespace-pre-wrap font-sans text-sm">{a.text}</pre>
    </details>)}</details>}
    {charges.length > 0 && <details><summary className="cursor-pointer font-semibold">Historiku i pagesave ({charges.length})</summary>{charges.map(charge => <p className="mt-2" key={charge.id}>
      {date(charge.created_at)} · {charge.type_display} · {charge.store_payment ? `${charge.store_payment.amount} ${charge.store_payment.currency}` : `${charge.amount} ${charge.currency || "EUR"}`} · {status(charge.status)} {charge.receipt_number && `· ${charge.receipt_number}`}
    </p>)}</details>}
  </section>;
}
