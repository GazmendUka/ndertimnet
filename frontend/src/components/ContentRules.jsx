import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { CONTENT_RULES, CONTENT_RULES_EVENT, acceptContentRules } from "../auth/contentRules";
import { isNativeApp, openExternalUrl } from "../platform/mobile";

export function ContentRulesLink() {
  return <a href="/content-rules.html" className="underline" target="_blank" rel="noopener noreferrer" onClick={event => {
    if (isNativeApp()) { event.preventDefault(); openExternalUrl("https://ndertimnet.com/content-rules.html").catch(() => {}); }
  }}>Rregullat e përdorimit dhe përmbajtjes</a>;
}

export function ContentRulesConsent({ checked, onChange }) {
  return <label className="flex min-h-[44px] items-start gap-3 text-sm leading-6 text-[#12251b]">
    <input type="checkbox" required checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1.5 shrink-0" />
    <span>Kam lexuar dhe pranoj <ContentRulesLink />. Ndalohen ngacmimi, mashtrimet dhe përmbajtja e paligjshme.</span>
  </label>;
}

export default function ContentRulesPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    const show = () => { setAccepted(false); setError(""); setOpen(true); };
    window.addEventListener(CONTENT_RULES_EVENT, show);
    return () => window.removeEventListener(CONTENT_RULES_EVENT, show);
  }, []);
  useEffect(() => { setOpen(false); }, [user?.id]);
  useEffect(() => {
    if (!open || !user) return;
    const element = dialog.current, previous = document.activeElement;
    element.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [open, user]);
  if (!open || !user) return null;
  return <dialog ref={dialog} onCancel={() => setOpen(false)} aria-labelledby="content-rules-title" className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/50">
    <h2 id="content-rules-title" className="text-xl font-semibold">Përpara se të ndani përmbajtje</h2>
    <p className="mt-3 text-sm leading-6">Këto rregulla vlejnë për profilet, kërkesat, ofertat, fotot, fushatat dhe bisedat.</p>
    <ul className="my-4 list-disc space-y-2 pl-5 text-sm leading-6">{CONTENT_RULES.map(rule => <li key={rule}>{rule}</li>)}</ul>
    <form onSubmit={event => {
      event.preventDefault(); if (!accepted) return;
      try { acceptContentRules(user.id); setOpen(false); }
      catch { setError("Pranimi nuk u ruajt. Kontrolloni ruajtjen në pajisje dhe provoni përsëri."); }
    }}>
      <ContentRulesConsent checked={accepted} onChange={setAccepted} />
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <p className="mt-3 text-xs text-gray-600">Pas pranimit, provoni përsëri veprimin që po kryenit. Përmbajtja nuk është dërguar.</p>
      <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="min-h-[44px] rounded-xl border px-4 text-sm font-semibold">Jo tani</button><button type="submit" disabled={!accepted} className="min-h-[44px] rounded-xl bg-[#17643f] px-4 text-sm font-semibold text-white disabled:opacity-50">Pranoj rregullat</button></div>
    </form>
  </dialog>;
}
