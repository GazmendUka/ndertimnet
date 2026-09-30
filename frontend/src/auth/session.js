// A response from an old login must never restore or replace a session.
const ID = "ndertimnet:session-id";
export const SESSION_EVENT = "ndertimnet:session-changed";
const announce = () => window.dispatchEvent(new Event(SESSION_EVENT));

export function getSession() {
  const storage = localStorage.getItem("refresh") || localStorage.getItem("access")
    ? localStorage : sessionStorage;
  const access = storage.getItem("access");
  const refresh = storage.getItem("refresh");
  if (!access && !refresh) return null;
  let id = storage.getItem(ID);
  if (!id) { id = crypto.randomUUID(); storage.setItem(ID, id); }
  return { storage, id, access, refresh };
}

export function isCurrentSession(session) {
  const current = getSession();
  return !!session && current?.id === session.id && current.storage === session.storage;
}

export function clearSession(expected) {
  if (expected && !isCurrentSession(expected)) return false;
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of ["access", "refresh", "user", ID]) storage.removeItem(key);
  }
  announce();
  return true;
}

export function startSession(tokens, rememberMe) {
  clearSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ID, crypto.randomUUID());
  storage.setItem("refresh", tokens.refresh);
  storage.setItem("access", tokens.access);
  announce();
  return getSession();
}

export function saveRenewedSession(expected, tokens) {
  if (!isCurrentSession(expected)) return false;
  expected.storage.setItem("refresh", tokens.refresh);
  expected.storage.setItem("access", tokens.access);
  announce();
  return true;
}
