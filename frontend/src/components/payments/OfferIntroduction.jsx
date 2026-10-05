import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { billingService } from "../../services/billingService";
import { hasSeenOfferIntroduction, markOfferIntroductionSeen } from "./offerIntroductionSession";

export default function OfferIntroduction({ userId }) {
  const [remaining, setRemaining] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (userId == null || hasSeenOfferIntroduction(userId)) return undefined;
    let active = true;
    billingService.subscription().then(({ data }) => {
      const count = data.free_offers_remaining;
      if (active && Number.isInteger(count) && count > 20 && count <= 25) {
        setRemaining(count);
      }
    }).catch(() => { /* An unavailable balance must not block browsing or invent a count. */ });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (remaining == null || !dialog) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    markOfferIntroductionSeen(userId);
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [remaining, userId]);

  if (remaining == null) return null;
  const dismiss = () => setRemaining(null);

  return (
    <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); dismiss(); }}
      aria-labelledby="offer-introduction-title" aria-describedby="offer-introduction-description"
      className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/50 sm:p-8">
      <button type="button" onClick={dismiss} aria-label="Mbyll"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
        <X size={20} />
      </button>
      <p className="mb-2 text-sm font-semibold text-emerald-700">Mirë se vini në kërkesat e punës</p>
      <h2 id="offer-introduction-title" className="mb-5 pr-8 text-2xl font-semibold">Si funksionon dërgimi i ofertave?</h2>
      <div id="offer-introduction-description" className="space-y-4 text-sm leading-6">
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-lg font-semibold text-emerald-900">Ju kanë mbetur {remaining} oferta falas.</p>
          <p>Një ofertë falas zbritet vetëm kur e nënshkruani dhe e dërgoni. Leximi i kërkesave dhe përgatitja e ofertës nuk e ulin gjendjen tuaj.</p>
        </div>
        <p><strong>Pasi të mbarojnë ofertat falas:</strong> zgjidhni Standard me 10 oferta/muaj ose Pro me 30. Nuk ka pagesë për lead ose ofertë. Një ofertë përdoret vetëm kur e nënshkruani dhe e dërgoni.</p>
        <p className="text-gray-600">Biseda hapet pasi dërgoni ofertën. Kontaktet direkte hapen pasi oferta të dërgohet.</p>
      </div>
      <button type="button" autoFocus onClick={dismiss} className="premium-btn btn-dark mt-6 w-full justify-center">E kuptova — shiko kërkesat</button>
    </dialog>
  );
}
