// frontend/src/auth/AuthContext.js

import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [refresh, setRefresh] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔧 Load tokens + user on startup + Fetch logged-in user
  // ============================================================

  useEffect(() => {
    const initAuth = async () => {
    const token =
      localStorage.getItem("access") || sessionStorage.getItem("access");

    const refreshToken =
      localStorage.getItem("refresh") || sessionStorage.getItem("refresh");


      // 1️⃣ Ingen token → ej inloggad
      if (!token || !refreshToken) {
        setLoading(false);
        return;
      }

      // 2️⃣ Tokens finns → sätt state
      setAccess(token);
      setRefresh(refreshToken);

      // 3️⃣ Hämta user MED token
      try {
        await fetchCurrentUser(token);
      } catch {
        // logout sker i fetchCurrentUser
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchCurrentUser = async (forcedAccessToken = null) => {
    try {
      const res = await api.get(
        "accounts/me/",
        forcedAccessToken
          ? {
              headers: {
                Authorization: `Bearer ${forcedAccessToken}`,
              },
            }
          : undefined
      );

      const usr = res.data.data;
      setUser(usr);
      const storage =
        localStorage.getItem("access") ? localStorage : sessionStorage;
      storage.setItem("user", JSON.stringify(usr));
      return usr;
    } catch (err) {
      console.error("fetchCurrentUser failed", err);
      logout(); // 🔥 ENDA stället auth-logout sker
      throw err;
    }
  };


  // ============================================================
  // 🔑 LOGIN
  // ============================================================
  const login = async (email, password, rememberMe = true) => {
    try {
      const res = await api.post(
        "accounts/login/",
        {
          email,
          password,
          remember_me: rememberMe,
        },
        { skipAuth: true }
      );


      const data = res.data.data;

      // 🔐 Spara tokens
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("access", data.access);
      storage.setItem("refresh", data.refresh);

      setAccess(data.access);
      setRefresh(data.refresh);

      // 👤 Hämta user MED token (ingen race condition)
      const usr = await fetchCurrentUser(data.access);

      return usr;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Gabim gjatë hyrjes");
    }
  };

  // ============================================================
  // 🚪 LOGOUT
  // ============================================================
  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    sessionStorage.removeItem("access");
    sessionStorage.removeItem("refresh");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    setUser(null);
    setAccess(null);
    setRefresh(null);
  };

  // ============================================================
  // 📧 Email verification helpers  ✅ RÄTT PLATS
  // ============================================================
  const isEmailVerified = !!user?.email_verified;

  const refreshMe = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        access,
        refresh,
        login,
        logout,
        loading,

        // 👤 user helpers
        fetchCurrentUser,
        refreshMe,
        isEmailVerified,

        // 🎭 roles
        isCompany: user?.role === "company",
        isCustomer: user?.role === "customer",
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
