export const getMediaUrl = (path) => {
  if (!path) return null;

  if (path.startsWith("http")) return path;

  const apiBase = process.env.REACT_APP_API_BASE_URL;

  if (!apiBase) {
    return window.location.origin + path;
  }

  const base = apiBase.replace(/\/api\/?$/, "");
  return `${base}${path}`;
};