// frontend/src/auth/VerifyEmail.jsx

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Mail, RefreshCw, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // ✅ Lägg till logout här
  const { isEmailVerified, refreshMe, logout } = useAuth();

  const [reactivated, setReactivated] = useState(false);
  const token = params.get("token");

  const [status, setStatus] = useState(token ? "loading" : "idle");
  const [message, setMessage] = useState("");

  // ============================================================
  // 🔐 VERIFY VIA TOKEN (MAIL LINK)
  // ============================================================
  useEffect(() => {
    if (!token) return;

    api
      .post("/accounts/verify-email/", { token })
      .then((res) => {
        const wasReactivated = !!res.data?.reactivated;

        setStatus("success");
        setReactivated(wasReactivated);

        // ✅ Sätt en tydlig standardtext om backend inte skickar detail
        setMessage(
          res.data?.detail ||
            (wasReactivated
              ? "Llogaria u riaktivizua me sukses. Ju lutem identifikohuni përsëri."
              : "Email-i u verifikua me sukses.")
        );

        setTimeout(async () => {
          if (wasReactivated) {
            // 🔥 VIKTIGT: rensa tokens + auth-state (enterprise)
            logout?.();
            navigate("/login", { replace: true });
          } else {
            await refreshMe();
            navigate("/", { replace: true });
          }
        }, 5000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.detail ||
            "Linku i verifikimit është i pavlefshëm ose ka skaduar."
        );
      });
  }, [token, navigate, refreshMe, logout]);

  // ============================================================
  // ✅ Already verified
  // ============================================================
  if (isEmailVerified) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6">
        <section className="w-full max-w-md rounded-2xl border border-[#e5e0d5] bg-white p-5 text-center shadow-sm sm:p-8">
          <CheckCircle2 className="mx-auto mb-4 text-[#17643f]" size={48} />
          <h2 className="mb-2 text-xl font-semibold text-[#12251b]">
            Email-i është tashmë i verifikuar
          </h2>
          <button
            onClick={() => navigate("/")}
            className="mt-4 min-h-[48px] rounded-xl bg-[#17643f] px-5 py-3 font-semibold text-white"
          >
            Vazhdo
          </button>
        </section>
      </main>
    );
  }

  // ============================================================
  // 📧 NO TOKEN → ONBOARDING / RESEND PAGE (SOFT)
  // ============================================================
  if (!token) {
    const resend = async () => {
      try {
        await api.post("/accounts/resend-verification/");
        toast.success("Email-i i verifikimit u dërgua përsëri.");
      } catch {
        toast.error("Nuk ishte e mundur të dërgohej email-i.");
      }
    };

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6">
        <section className="w-full max-w-md rounded-2xl border border-[#e5e0d5] bg-white p-5 text-center shadow-sm sm:p-8">
          <Mail className="mx-auto mb-4 h-10 w-10 text-[#ef7d22]" />
          <h2 className="mb-2 text-2xl font-semibold text-[#12251b]">
            Verifikoni email-in tuaj
          </h2>
          <p className="mb-6 leading-7 text-[#5f6f66]">
            Ju lutem kontrolloni inbox-in tuaj dhe klikoni linkun e verifikimit.
          </p>

          <button
            onClick={resend}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#17643f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f4f31]"
          >
            <RefreshCw className="h-4 w-4" />
            Dërgo email verifikimi përsëri
          </button>

          <div className="mt-6">
            <button
              onClick={() => navigate("/")}
              className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#17643f] hover:underline"
            >
              Kthehu te dashboard
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ============================================================
  // 🔄 VERIFYING / ERROR UI
  // ============================================================
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6">
      <section className="w-full max-w-md rounded-2xl border border-[#e5e0d5] bg-white p-5 text-center shadow-sm sm:p-8">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 animate-spin text-[#17643f]" size={42} />
            <h2 className="mb-2 text-xl font-semibold text-[#12251b]">
              Po verifikohet email-i…
            </h2>
            <p className="text-gray-600">Ju lutem prisni.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-[#17643f]" size={48} />
            <h2 className="mb-2 text-xl font-semibold text-[#12251b]">
              {reactivated ? "Llogaria u riaktivizua" : "Email i verifikuar"}
            </h2>
            <p className="text-gray-700">{message}</p>
            <p className="text-sm text-gray-500 mt-4">
              {reactivated
                ? "Ju lutem identifikohuni përsëri..."
                : "Do të ridrejtoheni automatikisht..."}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto mb-4 text-red-600" size={48} />
            <h2 className="mb-2 text-xl font-semibold text-red-700">
              Verifikimi dështoi
            </h2>
            <p className="text-gray-700 mb-4">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 min-h-[48px] rounded-xl bg-[#17643f] px-5 py-3 font-semibold text-white"
            >
              Kthehu
            </button>
          </>
        )}
      </section>
    </main>
  );
}
