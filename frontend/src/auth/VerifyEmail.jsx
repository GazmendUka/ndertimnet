// frontend/src/auth/VerifyEmail.jsx

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Linku i verifikimit është i pavlefshëm.");
      return;
    }

    api
      .post("/accounts/verify-email/", { token })
      .then((res) => {
        setStatus("success");
        setMessage(res.data?.detail || "Email-i u verifikua me sukses.");

        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2500);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.detail ||
            "Verifikimi dështoi. Linku mund të ketë skaduar."
        );
      });
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <h2 className="text-xl font-semibold mb-2">
              Po verifikohet adresa e email-it…
            </h2>
            <p className="text-gray-600">
              Ju lutem prisni një moment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              ✔️ Email i verifikuar
            </h2>
            <p className="text-gray-700 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              Do të ridrejtoheni te hyrja…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              ❌ Verifikimi dështoi
            </h2>
            <p className="text-gray-700 mb-4">{message}</p>

            <button
              onClick={() => navigate("/login")}
              className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-lg"
            >
              Shko te hyrja
            </button>
          </>
        )}
      </div>
    </div>
  );
}
