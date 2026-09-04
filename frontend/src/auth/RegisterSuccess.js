// frontent/src/auth/RegisterSucess.js

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function RegisterSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const accountType = location.state?.type;

  const [seconds, setSeconds] = useState(4);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);

    const interval = setInterval(() => {
      setSeconds((s) => (s > 1 ? s - 1 : 1));
    }, 1000);

    const timeout = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-6">
      <div
        className={`
          w-full max-w-lg rounded-2xl border border-[#e5e0d5] bg-white p-5 text-center shadow-sm sm:p-9
          transform transition-all duration-500
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
        `}
      >
        <div className="flex justify-center mb-6">
          <CheckCircle2
            className="text-[#17643f]"
            size={60}
            strokeWidth={1.5}
          />
        </div>

        <h1 className="mb-3 text-2xl font-semibold text-[#12251b]">
          Regjistrimi u krye me sukses!
        </h1>

        <p className="leading-7 text-[#5f6f66]">
          {accountType === "company"
            ? "Llogaria e kompanisë u krijua me sukses."
            : "Llogaria juaj u krijua me sukses."}
        </p>

        <p className="mt-4 rounded-xl bg-[#f4f9f6] p-4 text-sm leading-6 text-[#315c46]">
          Kontrolloni emailin dhe hapni linkun e verifikimit. Pastaj mund të kyçeni në llogarinë tuaj.
        </p>

        <p className="mt-4 text-sm text-gray-500">
          Do të kaloni te kyçja pas <strong>{seconds}</strong> sekondash…
        </p>

        <button
          onClick={() => navigate("/login", { replace: true })}
          className="mt-8 min-h-[48px] w-full rounded-xl bg-[#17643f] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4f31]"
        >
          Shko te kyçja
        </button>
      </div>
    </main>
  );
}
