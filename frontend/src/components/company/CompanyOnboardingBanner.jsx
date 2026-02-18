// frontend/src/components/company/CompanyOnboardingBanner.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, UserRoundCheck, ArrowRight, RefreshCw } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

/**
 * Production-ready onboarding banner for Company users.
 *
 * Step priority:
 *  1) Email not verified  -> Hapi 1/2
 *  2) Profile incomplete  -> Hapi 2/2
 *  else -> render null
 *
 * Data sources:
 *  - user.email_verified (or user.is_email_verified fallback)
 *  - profile completion from:
 *      props.profileCompletion
 *      company.profile_completion / company.profileCompleteness / company.profile_completion_percentage
 *      user.profile_completion / user.profileCompleteness / user.profile_completion_percentage
 */
export default function CompanyOnboardingBanner({
  company = null,
  profileCompletion = null, // optional override
  totalSteps = 2,
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

  const stepToRender = useMemo(() => {
    if (!emailVerified) return 1; // Hapi 1/2
    if (emailVerified && completion < profileTarget) return 2; // Hapi 2/2
    return null;
  }, [emailVerified, completion, profileTarget]);

  const ui = useMemo(() => {
    if (stepToRender === 1) {
      return {
        stepLabel: `Hapi 1 / ${totalSteps}`,
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
        stepLabel: `Hapi 2 / ${totalSteps}`,
        icon: UserRoundCheck,
        title: `Plotëso profilin tuaj – ${completion}%`,
        description:
          "Shto qytetin, specialitetet dhe të dhënat kryesore të kompanisë për të marrë më shumë projekte.",
        ctaLabel: "Plotëso Profilin",
        ctaIcon: ArrowRight,
        ctaAction: "profile",
      };
    }

    return null;
  }, [stepToRender, totalSteps, completion, resendLoading]);

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
    <div
      className={[
        "w-full rounded-2xl border border-amber-200 bg-amber-50",
        "px-4 py-4 md:px-6 md:py-5",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      {/* Header row: title left, step right */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
            <Icon className="h-5 w-5 text-amber-700" />
          </div>

          <div>
            <div className="text-base font-semibold text-amber-900">
              {ui.title}
            </div>
            <div className="mt-1 text-sm text-amber-800/80">
              {ui.description}
            </div>
          </div>
        </div>

        <div className="shrink-0 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-amber-900/70">
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
              "bg-amber-600 px-4 py-2 text-sm font-semibold text-white",
              "hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed",
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
        <div className="text-sm">
          {resendMessage?.type === "success" && (
            <div className="text-amber-900/80">{resendMessage.text}</div>
          )}
          {resendMessage?.type === "error" && (
            <div className="text-red-700">{resendMessage.text}</div>
          )}
        </div>

      </div>

    </div>
  );
}
