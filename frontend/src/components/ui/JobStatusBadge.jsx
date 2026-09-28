import React from "react";
import ModerationBadge from "./ModerationBadge";
import StatusBadge from "./StatusBadge";

export default function JobStatusBadge({ job }) {
  const label = job.is_completed || job.status === "completed"
    ? "E përfunduar"
    : job.status === "cancelled"
    ? "E anuluar"
    : job.status === "in_progress"
    ? "Në proces"
    : null;
  if (label) return <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold border bg-gray-50 text-gray-700">{label}</span>;
  if (job.moderation_status && job.moderation_status !== "approved") {
    return <ModerationBadge status={job.moderation_status} compact />;
  }
  return <StatusBadge active={job.is_active} />;
}
