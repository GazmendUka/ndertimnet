// frontend/src/services/cityService.js
import api from "../api/axios";

export const fetchCities = async () => {
  const res = await api.get("/locations/cities/", { skipAuth: true });
  return res.data.results;
};
