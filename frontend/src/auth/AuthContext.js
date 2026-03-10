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
  // 🔧 Init auth: load tokens + fetch current user
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

      // 3️⃣ Hämta user
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

  // ============================================================
  // 👤 Fetch logged-in user
  // ============================================================
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
      const status = err.response?.status;
      const code = err.response?.data?.code;

      console.warn("fetchCurrentUser failed", status, code);

      // ❌ Hård logout endast vid riktiga auth-fel
      if (status === 401) {
        setUser(null);
        setAccess(null);
        setRefresh(null);
      }
      throw err;
    }
  };

  // ============================================================
  // 🔑 LOGIN
  // ============================================================
  const login = async (email, password, rememberMe = true) => {
    setLoading(true);

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

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("access", data.access);
      storage.setItem("refresh", data.refresh);

      setAccess(data.access);
      setRefresh(data.refresh);

      // sätt user direkt
      setUser(data.user);

      // säkerställ att /me syncas
      try {
        await fetchCurrentUser(data.access);
      } catch {}

      return data.user;

    } catch (err) {

      throw new Error(err.response?.data?.message || "Gabim gjatë hyrjes");

    } finally {

      setLoading(false);

    }
  };
  // ============================================================
  // 🚪 LOGOUT
  // ============================================================
  const logout = () => {

    setLoading(true);

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    sessionStorage.removeItem("access");
    sessionStorage.removeItem("refresh");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    setUser(null);
    setAccess(null);
    setRefresh(null);

    setLoading(false);
  };

  // ============================================================
  // 📧 EMAIL / PROFILE STATUS
  // ============================================================
  const isAuthenticated = !!user;
  const isEmailVerified = !!user?.email_verified;
  const isProfileComplete = !!user?.profile_completed;

  // ============================================================
  // 🧭 ONBOARDING STEP LOGIC (NYTT)
  // ============================================================
  let onboardingStep = 0;

  if (!isAuthenticated) {
    onboardingStep = 0;
  } else if (!isEmailVerified) {
    onboardingStep = 1;
  } else if (!isProfileComplete) {
    onboardingStep = 2;
  } else {
    onboardingStep = 3;
  }


  // ============================================================
  // 🔐 PERMISSIONS (kan användas överallt)
  // ============================================================
  const canVerifyEmail = onboardingStep === 1;
  const canEditProfile = onboardingStep >= 2;
  const hasFullAccess = onboardingStep === 3;

  // ============================================================
  // 🔄 Refresh helper
  // ============================================================
  const refreshMe = async () => {
    if (!access) return;
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        // core
        user,
        access,
        refresh,
        loading,

        // auth actions
        login,
        logout,
        fetchCurrentUser,
        refreshMe,

        // status
        isAuthenticated,
        isEmailVerified,
        isProfileComplete,
        onboardingStep,

        // permissions
        canVerifyEmail,
        canEditProfile,
        hasFullAccess,

        // roles
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
