// src/utils/calcLeadStatus.js

export function calculateLeadStatus(lead) {
  const job = lead.job_request;

  if (!job) return "active"; // fallback

  const acceptedCompany = job.accepted_company;
  const leadCompany = lead.company?.id;

  // 1) If a winner is chosen
  if (acceptedCompany) {
    if (acceptedCompany === leadCompany) {
      return "won";  // this company won
    }
    return "lost";   // another company won
  }

  // 2) No winner yet → check if job is still active
  if (job.is_active) {
    return "active";
  }

  // 3) Job closed but no accepted company stored
  return "lost";
}
