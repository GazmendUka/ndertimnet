// src/api/axios.js

import axios from "axios";
const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const refreshApi = axios.create({
  //baseURL: "http://127.0.0.1:8000/api/",
  baseURL: BASE_URL,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});


const api = axios.create({
  // baseURL: "http://127.0.0.1:8000/api/",
  baseURL: BASE_URL,  
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ------------------------------------------------------------
// 🔐 Attach access token to all requests (unless skipAuth)
// ------------------------------------------------------------
api.interceptors.request.use((config) => {
  if (config.skipAuth) return config;

  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ------------------------------------------------------------
// 🔁 Auto-refresh token on 401 errors
// ------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || !originalRequest.url) {
      return Promise.reject(error);
    }

    // 🚫 Aldrig refresha refresh-endpointen
    if (originalRequest.url.includes("token/refresh")) {
      return Promise.reject(error);
    }

    // 🚫 hoppa över om skipAuth
    if (originalRequest.skipAuth) {
      return Promise.reject(error);
    }

    // 🚫 redan försökt
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh");
      if (!refresh) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        return Promise.reject(error);
      }

      try {
        const r = await refreshApi.post("token/refresh/", { refresh });
        const newAccess = r.data.access;

        localStorage.setItem("access", newAccess);

        return api.request({
          ...originalRequest,
          headers: {
            ...originalRequest.headers,
            Authorization: `Bearer ${newAccess}`,
          },
          skipAuth: true,
        });
      } catch (refreshErr) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
