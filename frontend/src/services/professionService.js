import api from "../api/axios";

export const fetchProfessions = async () => {
  const res = await api.get("/taxonomy/professions/", { skipAuth: true });
  return res.data?.results || res.data || [];
};

export const fetchIndustries = async () => {
  const res = await api.get("/taxonomy/industries/", { skipAuth: true });
  return res.data?.results || res.data || [];
};
