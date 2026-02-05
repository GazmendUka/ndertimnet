import api from "../api/axios";

export const fetchProfessions = async () => {
  const res = await api.get("/taxonomy/professions/", { skipAuth: true });
  return res.data.results;
};
