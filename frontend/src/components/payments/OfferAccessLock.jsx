// frontend/src/components/payments/OfferAccessLock.jsx

import React from "react";
import { Lock } from "lucide-react";

export default function OfferAccessLock({ onBuy, loading }) {
  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center">
      <div className="max-w-md w-full rounded-2xl border bg-white shadow-lg p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-red-100 text-red-600">
            <Lock size={28} />
          </div>
        </div>

        <h3 className="text-xl font-semibold">
          Offer access krävs
        </h3>

        <p className="text-gray-600">
          För att se detaljer och skicka offert krävs offer access.
        </p>

        <button
          onClick={onBuy}
          disabled={loading}
          className="w-full bg-black text-white rounded-xl py-3 font-medium hover:bg-gray-900 disabled:opacity-60"
        >
          {loading ? "Bearbetar..." : "Köp offer access – 15 €"}
        </button>
      </div>
    </div>
  );
}
