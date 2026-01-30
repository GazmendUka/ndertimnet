// ================================================
// frontend/src/utils/emailVerification.js
// Email verification helpers
// ================================================

export function isEmailNotVerifiedError(error) {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;

  if (status !== 403) return false;
  if (!detail || typeof detail !== "string") return false;

  return detail.toLowerCase().includes("email");
}
