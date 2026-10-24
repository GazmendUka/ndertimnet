import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/axios";

const buttonClass = "min-h-[44px] rounded-lg px-3 text-sm font-semibold underline underline-offset-4 disabled:opacity-50";
const reasons = [["harassment", "Ngacmim ose kërcënim"], ["scam", "Mashtrim"], ["inappropriate", "Përmbajtje e papërshtatshme"], ["other", "Arsye tjetër"]];

export default function ChatSafetyControls({ offerId, onStateChange, messageToReport, onReportClose }) {
  const [state, setState] = useState(null);
  const [mode, setMode] = useState("");
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef(null);
  const revision = useRef(0);
  const mutating = useRef(false);
  const applyState = useCallback(data => { setState(data); onStateChange(data); }, [onStateChange]);
  const refresh = useCallback(async () => {
    const current = revision.current;
    try { const { data } = await api.get(`offers/${offerId}/chat-safety/`); if (current === revision.current && !mutating.current) applyState(data); }
    catch { setError("Mbrojtja e bisedës nuk mund të ngarkohet. Provoni përsëri."); }
  }, [offerId, applyState]);
  useEffect(() => {
    let active = true;
    revision.current += 1;
    setState(null); onStateChange(null); setMode(""); setNotice(""); setError("");
    const load = async () => {
      if (mutating.current) return;
      const current = revision.current;
      try { const { data } = await api.get(`offers/${offerId}/chat-safety/`); if (active && current === revision.current && !mutating.current) applyState(data); }
      catch { if (active) setError("Mbrojtja e bisedës nuk mund të ngarkohet. Provoni përsëri."); }
    };
    load(); const timer = setInterval(load, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [offerId, applyState, onStateChange]);
  useEffect(() => {
    if (messageToReport) { setMode("report"); setReason("harassment"); setDetails(""); setAlsoBlock(false); setError(""); }
  }, [messageToReport]);
  useEffect(() => {
    if (!mode) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [mode]);
  const close = () => { if (!busy) { setMode(""); setError(""); onReportClose(); } };
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    mutating.current = true; revision.current += 1;
    try {
      if (mode === "report") {
        const { data } = await api.post(`offers/${offerId}/chat-reports/`, {
          reason, details: details.trim(), block_user: alsoBlock,
          ...(messageToReport ? { message_id: messageToReport.id } : {}),
        });
        applyState(data.chat_state);
        setNotice(data.already_reported ? "Raporti juaj është tashmë në pritje të shqyrtimit." : "Raporti u dërgua për shqyrtim. Faleminderit.");
      } else {
        const { data } = await api.post(`offers/${offerId}/chat-block/`, { blocked: mode === "block" });
        applyState(data); setNotice(mode === "block" ? "Përdoruesi u bllokua në të gjitha bisedat." : "Bllokimi juaj u hoq.");
      }
      setMode(""); onReportClose();
    } catch { setError("Veprimi nuk u krye. Provoni përsëri; asgjë nuk është konfirmuar."); }
    finally { mutating.current = false; setBusy(false); }
  };
  const open = value => { setError(""); setNotice(""); setReason("harassment"); setDetails(""); setAlsoBlock(false); setMode(value); };
  return <div className="border-b border-gray-100 bg-white px-4 py-2 sm:px-6">
    <div className="flex flex-wrap items-center justify-end gap-1" aria-label="Mbrojtja e bisedës">
      <button type="button" className={buttonClass} disabled={!state?.can_report} onClick={() => open("report")}>Raporto</button>
      <button type="button" className={`${buttonClass} text-red-700`} disabled={!state?.can_report} onClick={() => open(state?.blocked_by_me ? "unblock" : "block")}>{state?.blocked_by_me ? "Zhblloko" : "Blloko"}</button>
    </div>
    {notice && <p role="status" className="py-2 text-sm text-emerald-800">{notice}</p>}
    {!mode && error && <p role="alert" className="py-2 text-sm text-red-700">{error} <button type="button" className="min-h-[44px] underline" onClick={() => { setError(""); refresh(); }}>Riprovo</button></p>}
    {mode && <dialog ref={dialogRef} onCancel={event => { event.preventDefault(); close(); }} aria-labelledby="chat-safety-title" className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/50">
      <form onSubmit={submit} className="space-y-4">
        <h2 id="chat-safety-title" className="text-xl font-semibold">{mode === "report" ? "Raporto bisedën" : mode === "block" ? "Blloko përdoruesin?" : "Hiq bllokimin?"}</h2>
        {mode === "report" ? <>
          <p className="text-sm leading-6 text-gray-600">Administratori do ta shqyrtojë raportin. Pala tjetër nuk njoftohet për raportuesin.</p>
          {messageToReport && <blockquote className="max-h-28 overflow-y-auto break-words rounded-lg bg-gray-50 p-3 text-sm">{messageToReport.message}</blockquote>}
          <label className="block text-sm font-semibold">Arsyeja<select value={reason} onChange={e => setReason(e.target.value)} className="mt-2 min-h-[44px] w-full rounded-lg border p-2">{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block text-sm font-semibold">Përshkrimi {reason !== "other" && "(opsional)"}<textarea value={details} onChange={e => setDetails(e.target.value)} required={reason === "other"} minLength={reason === "other" ? 10 : undefined} maxLength={1000} rows={3} className="mt-2 w-full rounded-lg border p-3 text-base font-normal" /></label>
          <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" checked={alsoBlock} onChange={e => setAlsoBlock(e.target.checked)} />Blloko edhe këtë përdorues në të gjitha bisedat</label>
        </> : <p className="text-sm leading-6 text-gray-600">{mode === "block" ? "Ndalen mesazhet e reja mes jush në të gjitha bisedat. Historiku, ofertat dhe marrëveshjet ruhen. Bllokimi nuk anulon asnjë marrëveshje." : "Hiqet vetëm bllokimi që keni vendosur ju. Nëse edhe pala tjetër ju ka bllokuar, mesazhet mbeten të ndaluara."}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={busy} onClick={close} className="min-h-[44px] rounded-xl border px-4 text-sm font-semibold">Anulo</button>
          <button type="submit" disabled={busy || (mode === "report" && reason === "other" && details.trim().length < 10)} className="min-h-[44px] rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Duke u dërguar…" : mode === "report" ? "Dërgo raportin" : mode === "block" ? "Blloko" : "Zhblloko"}</button>
        </div>
      </form>
    </dialog>}
  </div>;
}
