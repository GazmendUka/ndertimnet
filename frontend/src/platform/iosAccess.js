import { Capacitor } from "@capacitor/core";

export const isIOSApp = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

function pathname(value) {
  try {
    return decodeURIComponent(new URL(value, "https://ndertimnet.com").pathname)
      .replace(/\/+/g, "/").replace(/\/$/, "");
  } catch { return ""; }
}

export const companyEntryPath = () => isIOSApp() ? "/login" : "/register/company";
export const companyEntryLabel = () => isIOSApp() ? "Kyçu si kompani" : "Regjistro kompaninë";

export function appDestination(path) {
  if (!isIOSApp()) return path;
  const name = pathname(path);
  if (/^\/register\/company(?:\/|$)/.test(name)) return "/login";
  if (name === "/register") return "/register/customer";
  if (/^\/pricing(?:\/|$)/.test(name)) return "/";
  return path;
}

export function isIOSPurchaseLink(value) {
  if (!isIOSApp()) return false;
  try {
    const url = new URL(value, "https://ndertimnet.com");
    if (!["ndertimnet.com", "www.ndertimnet.com", "app.ndertimnet.com"].includes(url.hostname)) return false;
    const name = pathname(value);
    return name === "/register" || /^\/(?:register\/company|pricing|company\/payments)(?:\/|$)/.test(name);
  } catch { return false; }
}

// A client-side safeguard, not a replacement for server authorization.
export function isIOSPurchaseRequest(config) {
  if (!isIOSApp() || ["get", "head", "options"].includes((config.method || "get").toLowerCase())) return false;
  const path = pathname(config.url).replace(/^\/api\//, "/");
  return path === "/accounts/register/company"
    || /^\/billing\/(?:subscribe|buy-offer-pack|change-plan|offer-checkout|\d+\/checkout)$/.test(path)
    || path === "/payments/pay-job";
}
