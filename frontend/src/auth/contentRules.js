export const CONTENT_RULES_VERSION = "2026-10-24-v1";
export const CONTENT_RULES_EVENT = "ndertimnet:content-rules-required";
export const CONTENT_RULES = [
  "Ndani vetëm informacion të saktë, të ligjshëm dhe që lidhet me shërbimet ose projektin.",
  "Ndalohen kërcënimet, ngacmimi, gjuha e urrejtjes, diskriminimi dhe dhuna.",
  "Ndalohen mashtrimet, spam-i, përmbajtja seksuale dhe çdo përmbajtje e paligjshme.",
  "Mos publikoni të dhëna personale të të tjerëve pa leje ose materiale për të cilat nuk keni të drejtë përdorimi.",
  "Përdorni Raporto dhe Blloko kur është e nevojshme. Administratori mund të fshehë përmbajtjen dhe të kufizojë llogaritë që shkelin rregullat.",
];
const key = userId => `ndertimnet:content-rules:${userId}`;
export function hasAcceptedContentRules(userId) {
  if (!userId) return false;
  try { return localStorage.getItem(key(userId)) === CONTENT_RULES_VERSION; } catch { return false; }
}
export function acceptContentRules(userId) {
  if (!userId) throw new Error("Mungon llogaria.");
  localStorage.setItem(key(userId), CONTENT_RULES_VERSION);
}
export function isContentWrite(config) {
  if (!/^(post|put|patch)$/i.test(config.method || "get")) return false;
  const route = String(config.url || "").replace(/^https?:\/\/[^/]+\/api\//, "").replace(/^\//, "").split("?")[0];
  if (/^offers\//.test(route)) return !/\/(chat-safety|chat-block|chat-reports|read|customer-opened)\/$/.test(route);
  if (/^jobrequests\//.test(route)) return !/\/(delete|archive|discard)\/$/.test(route);
  return /^leads\/leadmessages\//.test(route) || /^accounts\/profile\//.test(route)
    || /^accounts\/portfolio\//.test(route) || /^marketing\/campaigns\/$/.test(route);
}
