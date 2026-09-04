import React from "react";
import { Link } from "react-router-dom";

export default function ProfileGate({
  profileStep,
  requiredStep = 3,
  children,
}) {
  if (profileStep >= requiredStep) {
    return children;
  }

  return (
    <div className="border border-red-300 bg-red-50 rounded-lg p-6 space-y-3">
      <h3 className="font-semibold text-red-700">
        Profili nuk është i plotë
      </h3>
      <p className="text-sm text-red-600">
        Për të përdorur këtë funksion, duhet të plotësoni profilin e kompanisë.
      </p>

      <Link
        to="/company/profile"
        className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-red-600 px-4 py-2 text-white"
      >
        Plotëso profilin
      </Link>
    </div>
  );
}
