import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function RegisterSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  // 🧩 Merr llojin e regjistrimit
  const type = location.state?.type;

  const TITLES = {
    company: "Llogaria e kompanisë u krijua me sukses 🎉",
    customer: "Llogaria e klientit u krijua me sukses 🎉",
  };

  const title = TITLES[type] || "Llogaria u krijua me sukses 🎉";

  // ⏳ Kontroll + redirect automatike
  useEffect(() => {
    if (!location.state?.type) {
      navigate("/register");
      return;
    }

    const timer = setTimeout(() => {
      navigate("/");
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]); // ❗ korrigerat

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-md text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6 animate-bounce" />

        <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>

        <p className="text-gray-600 mb-6">
          Ju faleminderit që u regjistruat!
          Do të ridrejtoheni tek faqja e hyrjes pas pak sekondash...
        </p>

        <button
          onClick={() => navigate("/")}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Kthehu tek hyrja
        </button>
      </div>
    </div>
  );
}
