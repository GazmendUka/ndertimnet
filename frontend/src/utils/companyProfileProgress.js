// Display progress is separate from backend permissions and admin verification.
export const COMPANY_PROFILE_KEYS = [
  "basic", "professions", "service_areas", "description", "offer_text", "verification",
];

export function companyProfileProgress(sections = {}) {
  const completed = COMPANY_PROFILE_KEYS.filter(key => sections[key] === true).length;
  const firstFiveComplete = COMPANY_PROFILE_KEYS.slice(0, 5).every(key => sections[key] === true);
  // Do not reintroduce a reminder solely for the optional offer presentation.
  const requiredComplete = COMPANY_PROFILE_KEYS.filter(key => key !== "offer_text")
    .every(key => sections[key] === true);
  return {
    completed,
    total: COMPANY_PROFILE_KEYS.length,
    percent: Math.round(completed / COMPANY_PROFILE_KEYS.length * 100),
    needsReminder: !firstFiveComplete && !requiredComplete,
  };
}
