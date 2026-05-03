// ------------------------------------------------------------
// src/services/jobRequestDraftService.js
// ------------------------------------------------------------

import axiosInstance from "../api/axios";

const BASE_URL = "jobrequests/drafts/";

const jobRequestDraftService = {
  // ----------------------------------------------------------
  // 1️⃣ Skapa nytt utkast (ALWAYS safe payload)
  // ----------------------------------------------------------
  async createDraft() {
    const payload = {
      current_step: 1,
    };

    console.log("CREATE DRAFT PAYLOAD:", payload); // 🔍 DEBUG

    const response = await axiosInstance.post(BASE_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  },

  // ----------------------------------------------------------
  // 2️⃣ Uppdatera utkast
  // ----------------------------------------------------------
  async updateDraft(draftId, payload) {
    const response = await axiosInstance.patch(
      `${BASE_URL}${draftId}/`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  },

  // ----------------------------------------------------------
  // 3️⃣ Hämta ett specifikt utkast
  // ----------------------------------------------------------
  async getDraft(draftId) {
    const response = await axiosInstance.get(`${BASE_URL}${draftId}/`);
    return response.data;
  },

  // ----------------------------------------------------------
  // 4️⃣ Lista mina utkast
  // ----------------------------------------------------------
  async getMyDrafts() {
    const response = await axiosInstance.get(BASE_URL);
    return response.data;
  },

  // ----------------------------------------------------------
  // 5️⃣ Submit draft
  // ----------------------------------------------------------
  async submitDraft(draftId) {
    const response = await axiosInstance.post(
      `${BASE_URL}${draftId}/submit/`,
      {}
    );

    return response.data;
  },
};

export default jobRequestDraftService;