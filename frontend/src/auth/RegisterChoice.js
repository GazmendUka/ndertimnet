// frontend/src/auth/RegisterChoice.js

import { Building2, UserRound } from "lucide-react";
import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterChoice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-lg rounded-2xl p-10 w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Krijo një llogari të re 👋
        </h1>
        <p className="text-gray-600 mb-8">
          Zgjidh llojin e llogarisë që dëshiron të krijosh:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 🏢 Kompani */}
          <button
            onClick={() => navigate("/register/company")}
            className="flex flex-col items-center justify-center border border-gray-200 rounded-xl p-6 hover:bg-blue-50 hover:border-blue-300 transition group"
          >
            <Building2 className="w-10 h-10 text-blue-600 mb-3 group-hover:scale-110 transition" />
            <h3 className="text-lg font-semibold text-gray-800">
              Kompani
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Për bizneset që ofrojnë shërbime ndërtimi.
            </p>
          </button>

          {/* 👤 Klient */}
          <button
            onClick={() => navigate("/register/customer")}
            className="flex flex-col items-center justify-center border border-gray-200 rounded-xl p-6 hover:bg-green-50 hover:border-green-300 transition group"
          >
            <UserRound className="w-10 h-10 text-green-600 mb-3 group-hover:scale-110 transition" />
            <h3 className="text-lg font-semibold text-gray-800">
              Klient
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Për persona që kërkojnë ndihmë ose shërbim ndërtimi.
            </p>
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Ke tashmë një llogari?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:underline"
          >
            Hyr këtu
          </Link>
        </p>
      </div>
    </div>
  );
}
