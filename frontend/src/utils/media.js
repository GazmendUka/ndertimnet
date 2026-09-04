import { MEDIA_BASE_URL } from "../config/api";

export const getMediaUrl = (path) => {
  if (!path) return null;

  if (path.startsWith("http")) return path;

  return `${MEDIA_BASE_URL}${path}`;
};
