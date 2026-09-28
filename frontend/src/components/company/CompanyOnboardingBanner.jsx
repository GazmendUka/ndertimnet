// frontend/src/components/company/CompanyOnboardingBanner.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, UserRoundCheck, ArrowRight, RefreshCw } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";
import { companyProfileProgress } from "../../utils/companyProfileProgress";

/**
 * Email verification takes priority. Saved profile sections determine whether
 * to show the profile reminder; document submission/admin approval stay separate.
 * Legacy percentage fields are only a fallback when section data is unavailable.
 */
export default function CompanyOnboardingBanner({
  company = null,
  profileCompletion = null, // optional override
  profileTarget = 100,
  profileRoute = "/company/profile",
  resendVerificationEndpoint = null, // e.g. "/accounts/resend-verification/"
  className = "",
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState(null); // { type: 'success'|'error', text: string }

  const emailVerified = useMemo(() => {
    // Support a couple of likely backend field names without being brittle
    return Boolean(
      user?.email_verified ??
        user?.is_email_verified ??
        user?.emailVerified ??
        false
    );
  }, [user]);

  const completion = useMemo(() => {
    const raw =
      profileCompletion ??
      company?.profile_completion ??
      company?.profileCompleteness ??
      company?.profile_completion_percentage ??
      user?.profile_completion ??
      user?.profileCompleteness ??
      user?.profile_completion_percentage ??
      0;

    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }, [profileCompletion, company, user]);

  const sections = company?.profile_sections ?? user?.company?.profile_sections;
  const profile = sections ? companyProfileProgress(sections) : null;
  const needsProfileReminder = profile ? profile.needsReminder : completion < profileTarget;

  const stepToRender = useMemo(() => {
    if (!emailVerified) return 1;
    if (needsProfileReminder) return 2;
    return null;
  }, [emailVerified, needsProfileReminder]);

  const ui = useMemo(() => {
    if (stepToRender === 1) {
      return {
        stepLabel: "Verifikimi i email-it",
        icon: Mail,
        title: "Email-i juaj nuk është i verifikuar",
        description:
          "Ju lutem verifikoni email-in për të aktivizuar llogarinë dhe për të vazhduar me hapin tjetër.",
        ctaLabel: resendLoading ? "Duke dërguar..." : "Verifiko Email-in",
        ctaIcon: resendLoading ? RefreshCw : ArrowRight,
        ctaAction: "resend",
      };
    }

    if (stepToRender === 2) {
      return {
        stepLabel: profile ? `${profile.completed} nga ${profile.total} hapa` : "Profili i kompanisë",
        icon: UserRoundCheck,
        title: "Prezantoni kompaninë tuaj",
        description:
          "Një profil i plotë i ndihmon klientët të njohin shërbimet dhe përvojën tuaj. Vazhdoni aty ku e latë.",
        ctaLabel: "Plotëso Profilin",
        ctaIcon: ArrowRight,
        ctaAction: "profile",
      };
    }

    return null;
  }, [stepToRender, profile, resendLoading]);

  const handleResendVerification = async () => {
    if (!resendVerificationEndpoint) {
      setResendMessage({
        type: "error",
        text:
          "Mungon konfigurimi i endpoint-it për ridërgimin e email-it. (resendVerificationEndpoint)",
      });
      return;
    }

    try {
      setResendLoading(true);
      setResendMessage(null);

      // Most backends just need POST with auth cookie/JWT already on axios instance
      await api.post(resendVerificationEndpoint);

      setResendMessage({
        type: "success",
        text:
          "Email-i i verifikimit u dërgua. Ju lutem kontrolloni inbox-in (dhe Spam).",
      });
    } catch (err) {
      const fallback =
        "Dërgimi dështoi. Ju lutem provoni përsëri pas pak.";
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        fallback;

      setResendMessage({
        type: "error",
        text: String(detail),
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleCTA = async () => {
    if (!ui) return;

    if (ui.ctaAction === "resend") {
      await handleResendVerification();
      return;
    }

    if (ui.ctaAction === "profile") {
      navigate(profileRoute);
      return;
    }
  };

  if (!ui) return null;

  const Icon = ui.icon;
  const CtaIcon = ui.ctaIcon;

  return (
    <section
      aria-label="Udhëzimi i llogarisë"
      className={[
        "w-full min-w-0 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/50",
        "px-4 py-4 md:px-6 md:py-5",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      {/* Header row: title left, step right */}
      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <Icon className="h-5 w-5 text-emerald-800" />
          </div>

          <div className="min-w-0">
            <div className="break-words text-base font-semibold text-slate-900">
              {ui.title}
            </div>
            <div className="mt-1 max-w-2xl break-words text-sm leading-6 text-slate-600">
              {ui.description}
            </div>
          </div>
        </div>

        <div className="shrink-0 self-start rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          {ui.stepLabel}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* LEFT SIDE – CTA BUTTON */}
        <div>
          <button
            type="button"
            onClick={handleCTA}
            disabled={ui.ctaAction === "resend" ? resendLoading : false}
            className={[
              "inline-flex items-center justify-center gap-2 rounded-xl",
              "min-h-[44px] bg-emerald-900 px-4 py-2 text-sm font-semibold text-white",
              "hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed",
              "transition",
            ].join(" ")}
          >
            <CtaIcon
              className={[
                "h-4 w-4",
                resendLoading ? "animate-spin" : "",
              ].join(" ")}
            />
            {ui.ctaLabel}
          </button>
        </div>

        {/* RIGHT SIDE – MESSAGE */}
        <div className="text-sm" aria-live="polite">
          {resendMessage?.type === "success" && (
            <div className="text-emerald-800">{resendMessage.text}</div>
          )}
          {resendMessage?.type === "error" && (
            <div className="text-red-700">{resendMessage.text}</div>
          )}
        </div>
      </div>
    </section>
  );
}
