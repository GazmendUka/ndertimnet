// src/api/axios.js

import axios from "axios";

// ============================================================
// 🌐 BASE URL
// ============================================================

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://ndertimnet.onrender.com/api/"


// ============================================================
// 🔄 Helper: get tokens (local OR session)
// ============================================================

const getAccessToken = () =>
  localStorage.getItem("access") || sessionStorage.getItem("access");

const getRefreshToken = () =>
  localStorage.getItem("refresh") || sessionStorage.getItem("refresh");

const saveAccessToken = (token) => {
  if (localStorage.getItem("refresh")) {
    localStorage.setItem("access", token);
  } else if (sessionStorage.getItem("refresh")) {
    sessionStorage.setItem("access", token);
  } else {
    localStorage.setItem("access", token);
  }
};

const clearTokens = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  sessionStorage.removeItem("access");
  sessionStorage.removeItem("refresh");
};


// ============================================================
// 🔁 Axios instance for refresh requests
// ============================================================

const refreshApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});


// ============================================================
// 🌐 Main API instance
// ============================================================

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});


// ============================================================
// 🔐 Request interceptor
// Attach access token automatically
// ============================================================

api.interceptors.request.use((config) => {

  if (config.skipAuth) {
    return config;
  }

  const token = getAccessToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


// ============================================================
// 🔁 Response interceptor
// Auto refresh expired tokens
// ============================================================

api.interceptors.response.use(
  (response) => response,

  async (error) => {

    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 🚫 Skip if already retried
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // 🚫 Skip refresh endpoint
    if (originalRequest.url?.includes("token/refresh/")) {
      return Promise.reject(error);
    }

    // 🚫 Skip if skipAuth
    if (originalRequest.skipAuth) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {

      originalRequest._retry = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {

        const res = await refreshApi.post("token/refresh/", {
          refresh: refreshToken,
        });

        const newAccess = res.data.access;

        saveAccessToken(newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return api(originalRequest);

      } catch (refreshError) {

        clearTokens();
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


// ============================================================
// 🧪 Debug logger (optional but useful)
// ============================================================

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API ERROR:", err?.response || err);
    return Promise.reject(err);
  }
);

export default api;