import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { getSession, isCurrentSession, saveRenewedSession, clearSession } from "../auth/session";

const refreshApi = axios.create({ baseURL: API_BASE_URL, timeout: 20000, headers: { Accept: "application/json" } });
const api = axios.create({ baseURL: API_BASE_URL, headers: { Accept: "application/json" } });
const refreshes = new Map();
const sessionChanged = () => new axios.CanceledError("Session changed");

async function renew(session) {
  if (!isCurrentSession(session)) throw sessionChanged();
  const current = getSession();
  // A request or another tab may already have renewed this same login.
  if (current.refresh !== session.refresh || current.access !== session.access) return current.access;
  try {
    const { data } = await refreshApi.post("token/refresh/", { refresh: session.refresh });
    if (!isCurrentSession(session)) throw sessionChanged();
    if (typeof data?.access !== "string" || !data.access || typeof data?.refresh !== "string" || !data.refresh) {
      throw new Error("Incomplete session renewal response");
    }
    if (!saveRenewedSession(session, data)) throw sessionChanged();
    return data.access;
  } catch (error) {
    if (!isCurrentSession(session)) throw sessionChanged();
    const latest = getSession();
    if (latest.refresh !== session.refresh || latest.access !== session.access) return latest.access;
    // Outages/timeouts/rate limits do not prove that the session is invalid.
    if (error.response?.status === 401 && getSession()?.refresh === session.refresh) {
      clearSession(session);
      window.location.assign("/login");
    }
    throw error;
  }
}

function refreshSession(session) {
  if (!refreshes.has(session.id)) {
    // Web Locks also coordinate localStorage sessions across browser tabs.
    // Without Web Locks, renewal is still coalesced within the current page.
    const work = session.storage === localStorage && navigator.locks?.request
      ? navigator.locks.request("ndertimnet:session-renewal", () => renew(session))
      : Promise.resolve().then(() => renew(session));
    const pending = work.finally(() => {
      if (refreshes.get(session.id) === pending) refreshes.delete(session.id);
    });
    refreshes.set(session.id, pending);
  }
  return refreshes.get(session.id);
}

api.interceptors.request.use((config) => {
  if (config.skipAuth) return config;
  const session = getSession();
  if (config._authSession && !isCurrentSession(config._authSession)) throw sessionChanged();
  config._authSession = session;
  config.headers = config.headers || {};
  if (session?.access) config.headers.Authorization = `Bearer ${session.access}`;
  return config;
});

api.interceptors.response.use(response => {
  if (response.config._authSession && !isCurrentSession(response.config._authSession)) throw sessionChanged();
  return response;
}, async error => {
  const request = error.config;
  if (!request || request.skipAuth || request.url?.includes("token/refresh/") || error.response?.status !== 401) throw error;
  const session = request._authSession;
  if (!session || !isCurrentSession(session)) throw sessionChanged();
  if (request._retry || !session.refresh) {
    if (getSession()?.access !== session.access) throw sessionChanged();
    clearSession(session);
    window.location.assign("/login");
    throw error;
  }
  request._retry = true;
  const current = getSession();
  if (current.access === session.access) await refreshSession(session);
  // Never replay an old account's operation under a newly logged-in account.
  if (!isCurrentSession(session)) throw sessionChanged();
  return api(request);
});

api.interceptors.response.use(response => response, error => {
  // Full Axios errors may contain credentials and submitted customer data.
  if (!error?.config?.skipErrorLog && !axios.isCancel(error)) {
    console.error("API request failed", { status: error.response?.status, code: error.code });
  }
  return Promise.reject(error);
});

export default api;
