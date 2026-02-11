// src/components/email/EmailVerificationBanner.jsx

import { useState } from "react";
import { Mail, RefreshCw, CheckCircle2, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

export default function EmailVerificationBanner() {
  const {
    onboardingStep,
    isEmailVerified,
    refreshMe,
    isCompany,
  } = useAuth();

  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (onboardingStep === 0 || onboardingStep === 3) return null;

  // ============================================================
  // STEP 1 – EMAIL VERIFICATION
  // ============================================================
  if (onboardingStep === 1) {
    const resend = async () => {
      try {
        setSending(true);
        await api.post("/accounts/resend-verification/");
        toast.success(
          "Email-i i verifikimit u dërgua. Kontrolloni inbox-in ose spam-in."
        );
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          "Nuk ishte e mundur të dërgohej email-i i verifikimit për momentin.";
        toast.error(msg);
      } finally {
        setSending(false);
      }
    };

    const iVerified = async () => {
      try {
        setRefreshing(true);
        await refreshMe();
        toast.success("Statusi u përditësua!");
      } catch {
        toast.error("Nuk ishte e mundur të përditësohej statusi.");
      } finally {
        setRefreshing(false);
      }
    };

    return (
      <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
        <div className="flex gap-3">
          <Mail className="h-5 w-5 mt-1 text-amber-700" />

          <div className="flex-1">
            <div className="font-semibold text-amber-900">
              📧 Email-i juaj nuk është i verifikuar
            </div>

            <div className="mt-1 text-sm text-amber-800">
              Verifikoni email-in tuaj për të vazhduar përdorimin e plotë të
              platformës.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={resend}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                {sending ? "Duke dërguar..." : "Dërgo email verifikimi përsëri"}
              </button>

              <button
                onClick={iVerified}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-800 px-3 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {refreshing ? "Duke përditësuar..." : "E kam verifikuar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 2 – PROFILE NOT COMPLETE
  // ============================================================
  if (onboardingStep === 2) {
    const profilePath = isCompany
      ? "/profile/company"
      : "/profile/customer";

    return (
      <div className="mb-6 rounded-2xl border border-blue-300 bg-blue-50 p-4 shadow-sm">
        <div className="flex gap-3">
          <User className="h-5 w-5 mt-1 text-blue-700" />

          <div className="flex-1">
            <div className="font-semibold text-blue-900">
              📝 Profili juaj nuk është i plotë
            </div>

            <div className="mt-1 text-sm text-blue-800">
              Plotësoni profilin tuaj për të përfituar qasje të plotë në
              platformë.
            </div>

            <div className="mt-3 h-2 w-full bg-blue-200 rounded">
              <div className="h-2 w-[40%] bg-blue-600 rounded"></div>
            </div>
            <p className="mt-1 text-xs text-blue-700">40 % i përfunduar</p>

            <div className="mt-4">
              <Link
                to={profilePath}
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Plotëso profilin
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
