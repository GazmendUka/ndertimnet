// frontend/src/auth/AuthContext.jsx

import { createContext, useCallback, useContext, useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { resetOfferIntroduction } from "../components/payments/offerIntroductionSession";
import { deactivateCurrentPushDevice } from "../services/notificationService";
import { getSession, isCurrentSession, clearSession, startSession, SESSION_EVENT } from "./session";

const AuthContext = createContext();

// ------------------------------------------------------------
// 🔧 Storage helpers
// ------------------------------------------------------------

const getAccessToken = () => getSession()?.access;

const clearStorage = (expected) => {
  resetOfferIntroduction();
  return clearSession(expected);
};

// ============================================================
// AUTH PROVIDER
// ============================================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [refresh, setRefresh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const sessionId = useRef(getSession()?.id);

  useEffect(() => {
    const sync = () => {
      const session = getSession();
      if (sessionId.current !== session?.id) setUser(null);
      sessionId.current = session?.id;
      setAccess(session?.access || null);
      setRefresh(session?.refresh || null);
      if (!session) setAuthError(false);
    };
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // ============================================================
  // 🚪 LOGOUT
  // ============================================================

  const logout = useCallback(async () => {
    const session = getSession();
    await deactivateCurrentPushDevice().catch(() => undefined);
    if (session && !isCurrentSession(session)) return;
    if (!session && getSession()) return;
    clearStorage(session);
    setUser(null);
    setAccess(null);
    setRefresh(null);
    setLoading(false);
    setAuthError(false);

    window.location.href = "/";
  }, []);

  // ============================================================
  // 👤 Fetch current user
  // ============================================================

  const fetchCurrentUser = useCallback(async () => {
    const session = getSession();
    try {
      const res = await api.get("accounts/me/");
      if (!isCurrentSession(session)) {
        const cancelled = new Error("Session changed");
        cancelled.code = "ERR_CANCELED";
        throw cancelled;
      }

      const usr = res.data?.data || res.data;

      setUser(usr);
      setAuthError(false);
      session.storage.setItem("user", JSON.stringify(usr));

      return usr;
    } catch (err) {
      const status = err.response?.status;

      console.warn("fetchCurrentUser failed:", status);

      if (status === 401 && isCurrentSession(session)) {
        clearStorage(session);
        setUser(null);
      }

      throw err;
    }
  }, []);

  // ============================================================
  // 🔧 Init auth (on app load)
  // ============================================================

  const initAuth = useCallback(async () => {
      const session = getSession();
      const token = session?.access;
      const refreshToken = session?.refresh;

      if (!token || !refreshToken) {
        setLoading(false);
        return;
      }

      setAccess(token);
      setRefresh(refreshToken);
      setLoading(true);
      setAuthError(false);

      try {
        await fetchCurrentUser();
      } catch (err) {
        if (isCurrentSession(session) && err.code !== "ERR_CANCELED") setAuthError(true);
      } finally {
        setLoading(false);
      }
  }, [fetchCurrentUser]);

  useEffect(() => { initAuth(); }, [initAuth]);

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

      resetOfferIntroduction();
      const data = res.data?.data || res.data;
      const session = startSession(data, rememberMe);

      setAccess(data.access);
      setRefresh(data.refresh);

      // ✅ ENDA source of truth
      try {
        await fetchCurrentUser();
      } catch (error) {
        if (isCurrentSession(session) && error.code !== "ERR_CANCELED") setAuthError(true);
        throw error;
      }

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
      await fetchCurrentUser();
    } catch (err) {
      console.warn("refreshMe failed");
    }
  };

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  if (authError && !user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div role="alert" className="max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Lidhja nuk mund të verifikohet</h1>
          <p className="mt-3 text-gray-600">Kontrolloni lidhjen me internetin dhe provoni përsëri. Të dhënat e hyrjes janë ruajtur.</p>
          <button className="premium-btn btn-dark mt-5" onClick={initAuth} disabled={loading}>Provo përsëri</button>
          <button className="block mx-auto mt-4 underline" onClick={logout}>Dil nga llogaria</button>
        </div>
      </main>
    );
  }

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
