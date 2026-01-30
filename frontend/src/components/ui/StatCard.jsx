// src/components/ui/StatCard.jsx
import React from "react";

/**
 * StatCard – liten, ren, Apple-style informationsruta.
 * Används för statistik: antal job requests, aktiva, stängda, osv.
 */
export default function StatCard({ label, value, icon }) {
  return (
    <div
      className="
        bg-white/80 backdrop-blur
        border border-gray-200
        rounded-2xl shadow-sm
        px-5 py-4 sm:px-6 sm:py-5
        flex items-center justify-between
        transition hover:shadow-md
      "
    >
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-gray-900">
          {value}
        </p>
      </div>

      <div
        className="
          w-10 h-10 rounded-full bg-gray-50
          flex items-center justify-center
          border border-gray-100
        "
      >
        <span className="text-gray-400">{icon}</span>
      </div>
    </div>
  );
}
