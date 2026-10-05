const KEY = "ndertimnet.guest-project.v1";
export function readGuestProject() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY));
    const valid = value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)
      && typeof value.title === "string" && value.title.length <= 255
      && typeof value.description === "string" && value.description.length <= 10000
      && [value.city, value.profession].every(v => typeof v === "string" && /^\d{0,9}$/.test(v))
      && (value.industry === undefined || (typeof value.industry === "string" && /^\d{0,9}$/.test(value.industry)))
      && (value.category_mode === undefined || ["", "mixed", "unsure"].includes(value.category_mode))
      && Number.isFinite(value.savedAt) && value.savedAt <= Date.now() && Date.now() - value.savedAt <= 86400000;
    if (!valid) {
      sessionStorage.removeItem(KEY); return null;
    }
    return value;
  } catch { return null; }
}
export function saveGuestProject(project) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...project, savedAt: Date.now() })); return true; }
  catch { return false; }
}
export function clearGuestProject() { try { sessionStorage.removeItem(KEY); } catch {} }
