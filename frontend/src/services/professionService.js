forntend/src/services/professionService.js

import { apiPublic } from "../api/axios";

export const fetchProfessions = async () => {
  const res = await apiPublic.get("/taxonomy/professions/");
  return res.data.results;
};
