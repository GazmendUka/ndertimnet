// frontend/src/auth/VerifyEmail.jsx

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isEmailVerified, refreshMe } = useAuth();

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
        setStatus("success");
        setMessage(res.data?.detail || "Email-i u verifikua me sukses.");

        setTimeout(async () => {
          await refreshMe();
          navigate("/", { replace: true });
        }, 2000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.detail ||
            "Linku i verifikimit është i pavlefshëm ose ka skaduar."
        );
      });
  }, [token, navigate, refreshMe]);

  // ============================================================
  // ✅ Already verified
  // ============================================================
  if (isEmailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-green-600 mb-2">
            ✔️ Email-i është tashmë i verifikuar
          </h2>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg"
          >
            Vazhdo
          </button>
        </div>
      </div>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full text-center">
          <Mail className="mx-auto h-8 w-8 text-amber-600 mb-3" />
          <h2 className="text-xl font-semibold mb-2">
            Verifikoni email-in tuaj
          </h2>
          <p className="text-gray-600 mb-6">
            Ju lutem kontrolloni inbox-in tuaj dhe klikoni linkun e verifikimit.
          </p>

          <button
            onClick={resend}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-white hover:bg-amber-800"
          >
            <RefreshCw className="h-4 w-4" />
            Dërgo email verifikimi përsëri
          </button>

          <div className="mt-6">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-gray-500 hover:underline"
            >
              Kthehu te dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🔄 VERIFYING / ERROR UI
  // ============================================================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              Po verifikohet email-i…
            </h2>
            <p className="text-gray-600">Ju lutem prisni.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              ✔️ Email i verifikuar
            </h2>
            <p className="text-gray-700">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              ❌ Verifikimi dështoi
            </h2>
            <p className="text-gray-700 mb-4">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg"
            >
              Kthehu
            </button>
          </>
        )}
      </div>
    </div>
  );
}
