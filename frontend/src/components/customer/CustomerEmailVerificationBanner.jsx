import { useState } from "react";
import api from "../../api/axios";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";

export default function CustomerEmailVerificationBanner({
  user,
  resendVerificationEndpoint,
}) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Om email redan verifierad → visa inget
  if (!user || user.email_verified) {
    return null;
  }

  const resendEmail = async () => {
    if (loading || cooldown > 0) return;

    setLoading(true);

    try {
      await api.post(resendVerificationEndpoint);

      toast.success("Email verifikimi u dërgua përsëri.");

      // cooldown 30 sekunder
      setCooldown(30);

      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      toast.error("Nuk mund të dërgojmë email-in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
      flex items-center justify-between
      bg-amber-50 border border-amber-200
      text-amber-900
      px-6 py-4
      rounded-xl
      shadow-sm
      animate-fade-in
      "
    >
      {/* LEFT SIDE */}
      <div className="flex items-center gap-4">

        <div
          className="
          flex items-center justify-center
          w-10 h-10
          rounded-lg
          bg-amber-100
          "
        >
          <Mail className="w-5 h-5 text-amber-600" />
        </div>

        <div className="text-sm">

          <p className="font-semibold">
            Ju lutem verifikoni email-in tuaj
          </p>

          <p className="text-xs text-amber-700">
            Pa verifikim nuk mund të publikoni kërkesa pune.
          </p>

        </div>

      </div>

      {/* RIGHT SIDE BUTTON */}
      <button
        onClick={resendEmail}
        disabled={loading || cooldown > 0}
        className="
        flex items-center gap-2
        bg-amber-600 hover:bg-amber-700
        text-white text-sm font-medium
        px-4 py-2
        rounded-lg
        transition
        disabled:opacity-60
        "
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}

        {cooldown > 0 ? `Prisni ${cooldown}s` : "Dërgo përsëri"}
      </button>
    </div>
  );
}