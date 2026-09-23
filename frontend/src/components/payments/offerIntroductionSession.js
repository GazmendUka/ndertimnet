const KEY = "ndertimnet:offer-introduction-seen";
const seenInMemory = new Set();

export function hasSeenOfferIntroduction(userId) {
  if (seenInMemory.has(String(userId))) return true;
  try { return sessionStorage.getItem(KEY) === String(userId); }
  catch { return false; }
}

export function markOfferIntroductionSeen(userId) {
  seenInMemory.add(String(userId));
  try { sessionStorage.setItem(KEY, String(userId)); } catch { /* Memory fallback. */ }
}

export function resetOfferIntroduction() {
  seenInMemory.clear();
  try { sessionStorage.removeItem(KEY); } catch { /* Storage may be unavailable. */ }
}
