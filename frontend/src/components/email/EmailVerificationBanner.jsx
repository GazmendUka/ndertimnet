///////////////////////////////////////////////////
// src/components/email/emailVerificationBanner.jsx 
///////////////////////////////////////////////////

import { useState } from "react";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

export default function EmailVerificationBanner() {
  const { isEmailVerified, refreshMe } = useAuth();
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (isEmailVerified) return null;

  // ------------------------------------------------------------
  // Resend verification email
  // ------------------------------------------------------------
  const resend = async () => {
    try {
      setSending(true);
      await api.post("/accounts/resend-verification/");
      toast.success("Email-i i verifikimit u dërgua. Kontrolloni inbox-in ose spam-in.");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Nuk ishte e mundur të dërgohej email-i i verifikimit për momentin."
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // ------------------------------------------------------------
  // User confirms email is verified → refresh /me
  // ------------------------------------------------------------
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
            Verifikoni email-in tuaj për të publikuar punë dhe për të kryer veprime të rëndësishme.
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
