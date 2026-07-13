import React from "react";
import { AlertCircle, Ban, CheckCircle2, Clock3, PencilLine } from "lucide-react";

const META = {
  pending: {
    label: "Në shqyrtim",
    classes: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock3,
  },
  approved: {
    label: "E publikuar",
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  changes_requested: {
    label: "Kërkon ndryshime",
    classes: "border-blue-200 bg-blue-50 text-blue-700",
    icon: PencilLine,
  },
  rejected: {
    label: "E refuzuar",
    classes: "border-red-200 bg-red-50 text-red-700",
    icon: AlertCircle,
  },
  blocked: {
    label: "E bllokuar",
    classes: "border-gray-300 bg-gray-100 text-gray-700",
    icon: Ban,
  },
};

export default function ModerationBadge({ status, compact = false }) {
  const meta = META[status] || META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${meta.classes} ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"}`}>
      <Icon size={compact ? 12 : 14} />
      {meta.label}
    </span>
  );
}
