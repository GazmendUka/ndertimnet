import React from "react";

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

      <a
        href="/profile/company"
        className="inline-block mt-2 px-4 py-2 bg-red-600 text-white rounded"
      >
        Plotëso profilin
      </a>
    </div>
  );
}
