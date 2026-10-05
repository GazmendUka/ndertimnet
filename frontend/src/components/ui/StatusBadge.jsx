// src/components/ui/StatusBadge.jsx
import React from "react";

export default function StatusBadge({ active, status }) {
  const baseClasses =
    "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition";

  if (status !== undefined) {
    const labels = {
      draft: "Projekt-ofertë",
      signed: "Në pritje të përgjigjes",
      accepted: "E pranuar",
      rejected: "E refuzuar",
      locked: "E bllokuar",
    };
    return <span className={`${baseClasses} bg-gray-50 text-gray-700 border-gray-200`}>
      {labels[status] || "Status i panjohur"}
    </span>;
  }

  if (active) {
    return (
      <span
        className={`${baseClasses} 
          bg-green-50 text-green-700 border-green-200
        `}
      >
        Aktiv
      </span>
    );
  }

  return (
    <span
      className={`${baseClasses}
        bg-gray-50 text-gray-600 border-gray-200
      `}
    >
      E mbyllur
    </span>
  );
}
