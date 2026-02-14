// frontent/src/auth/RegisterSucess.js

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { CheckCircle } from "lucide-react";

export default function RegisterSuccess() {
  const navigate = useNavigate();
  const { isCompany, user } = useAuth();

  const [seconds, setSeconds] = useState(4);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);

    const interval = setInterval(() => {
      setSeconds((s) => (s > 1 ? s - 1 : 1));
    }, 1000);

    const timeout = setTimeout(() => {
      navigate(
        isCompany ? "/company/profile" : "/profile/customer",
        { replace: true }
      );
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate, isCompany]);

  const companyName =
    isCompany && user?.company_name
      ? user.company_name
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div
        className={`
          w-full max-w-lg bg-white border rounded-2xl p-10 shadow-sm text-center
          transform transition-all duration-500
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
        `}
      >
        <div className="flex justify-center mb-6">
          <CheckCircle
            className="text-green-600 animate-pulse"
            size={64}
            strokeWidth={1.5}
          />
        </div>

        <h1 className="text-2xl font-semibold mb-3">
          Regjistrimi u krye me sukses!
        </h1>

        <p className="text-gray-700">
          Llogaria juaj u krijua me sukses.
        </p>

        {companyName && (
          <p className="mt-2 text-gray-800 font-medium">
            Mirë se vini, {companyName}
          </p>
        )}

        <p className="mt-4 text-gray-600">
          Një email verifikimi ju është dërguar.
        </p>

        <p className="mt-4 text-sm text-gray-500">
          Do të ridrejtoheni pas <strong>{seconds}</strong> sekondash…
        </p>

        <button
          onClick={() =>
            navigate(
              isCompany
                ? "/company/profile"
                : "/profile/customer",
              { replace: true }
            )
          }
          className="mt-8 w-full bg-black text-white rounded-xl py-3 hover:opacity-90 transition"
        >
          Vazhdo tani
        </button>
      </div>
    </div>
  );
}
