// frontend/src/auth/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

// ------------------------------------------------------------
// 🔧 Storage helpers
// ------------------------------------------------------------

const getAccessToken = () =>
  localStorage.getItem("access") || sessionStorage.getItem("access");

const getRefreshToken = () =>
  localStorage.getItem("refresh") || sessionStorage.getItem("refresh");

const getStorage = () => {
  if (localStorage.getItem("access")) return localStorage;
  if (sessionStorage.getItem("access")) return sessionStorage;
  return localStorage;
};

const clearStorage = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");

  sessionStorage.removeItem("access");
  sessionStorage.removeItem("refresh");
  sessionStorage.removeItem("user");
};

// ============================================================
// AUTH PROVIDER
// ============================================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [refresh, setRefresh] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🚪 LOGOUT
  // ============================================================

  const logout = () => {
    clearStorage();
    setUser(null);
    setAccess(null);
    setRefresh(null);
    setLoading(false);

    window.location.href = "/";
  };

  // ============================================================
  // 👤 Fetch current user
  // ============================================================

  const fetchCurrentUser = async (forcedToken = null) => {
    try {
      const res = await api.get(
        "accounts/me/",
        forcedToken
          ? {
              headers: {
                Authorization: `Bearer ${forcedToken}`,
              },
            }
          : undefined
      );

      const usr = res.data?.data || res.data;

      setUser(usr);

      const storage = getStorage();
      storage.setItem("user", JSON.stringify(usr));

      return usr;
    } catch (err) {
      const status = err.response?.status;

      console.warn("fetchCurrentUser failed:", status);

      if (status === 401) {
        logout();
      }

      throw err;
    }
  };

  // ============================================================
  // 🔧 Init auth (on app load)
  // ============================================================

  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!token || !refreshToken) {
        setLoading(false);
        return;
      }

      setAccess(token);
      setRefresh(refreshToken);

      try {
        await fetchCurrentUser(token);
      } catch (err) {
        console.warn("Auth init failed");
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

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

      const data = res.data?.data || res.data;
      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("access", data.access);
      storage.setItem("refresh", data.refresh);

      setAccess(data.access);
      setRefresh(data.refresh);

      // ✅ ENDA source of truth
      await fetchCurrentUser(data.access);

      return data.user;
    } catch (err) {
      throw err; // viktigt för korrekt error handling i UI
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 📧 STATUS FLAGS
  // ============================================================

  const isAuthenticated = !!user;
  const isEmailVerified = !!user?.email_verified;
  const isProfileComplete = !!user?.profile_completed;

  // ============================================================
  // 🧭 ONBOARDING STEP
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
  // 🔐 PERMISSIONS
  // ============================================================

  const canVerifyEmail = onboardingStep === 1;
  const canEditProfile = onboardingStep >= 2;
  const hasFullAccess = onboardingStep === 3;

  // ============================================================
  // 🔄 Refresh user
  // ============================================================

  const refreshMe = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      await fetchCurrentUser(token);
    } catch (err) {
      console.warn("refreshMe failed");
    }
  };

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  return (
    <AuthContext.Provider
      value={{
        // core
        user,
        access,
        refresh,
        loading,

        // actions
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

        // roles (ENDAST dessa)
        isCompany: user?.role === "company",
        isCustomer: user?.role === "customer",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// Hook
// ============================================================

export const useAuth = () => useContext(AuthContext);