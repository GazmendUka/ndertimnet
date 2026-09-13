import React from "react";
import { isNativeApp, openExternalUrl } from "../platform/mobile";
import toast from "react-hot-toast";

// Real HTML pages remain readable without JavaScript or a user account.
// Native builds open the current public policy without replacing the app WebView.
export function LegalLink({ deletion = false, children, className = "underline", onClick }) {
  const path = deletion ? "/account-deletion.html" : "/privacy.html";
  const href = `https://ndertimnet.com${path}`;

  const handleClick = async (event) => {
    if (!isNativeApp()) return;
    event.preventDefault();
    try {
      await openExternalUrl(href);
      onClick?.();
    } catch {
      toast.error("Faqja nuk u hap. Provoni përsëri kur të keni lidhje interneti.");
    }
  };

  return <a href={isNativeApp() ? href : path} onClick={handleClick} className={className}>{children || (deletion ? "Fshirja e llogarisë" : "Politika e privatësisë")}</a>;
}

export default function LegalLinks({ onClick }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-[#17643f]">
      <LegalLink className="rounded-lg px-3 py-3 underline hover:bg-gray-50" onClick={onClick} />
      <LegalLink deletion className="rounded-lg px-3 py-3 underline hover:bg-gray-50" onClick={onClick} />
    </div>
  );
}
