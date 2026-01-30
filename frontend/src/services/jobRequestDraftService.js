// ------------------------------------------------------------
// src/services/jobRequestDraftService.js
// ------------------------------------------------------------

import axiosInstance from "../api/axios"; // din befintliga axios-instans

const jobRequestDraftService = {
  // ----------------------------------------------------------
  // 1️⃣ Skapa nytt utkast (steg 1 start)
  // POST /api/jobrequests/drafts/
  // ----------------------------------------------------------
  async createDraft() {
    const response = await axiosInstance.post("jobrequests/drafts/", {
      current_step: 1,
    });
    return response.data;
  },

  // ----------------------------------------------------------
  // 2️⃣ Uppdatera utkast per steg (steg 1→4)
  // PATCH /api/jobrequests/drafts/<id>/
  // ----------------------------------------------------------
  async updateDraft(draftId, payload) {
    const response = await axiosInstance.patch(
      `jobrequests/drafts/${draftId}/`,
      payload
    );
    return response.data;
  },

  // ----------------------------------------------------------
  // 3️⃣ Hämta ett specifikt utkast
  // GET /api/jobrequests/drafts/<id>/
  // ----------------------------------------------------------
  async getDraft(draftId) {
    const response = await axiosInstance.get(
      `jobrequests/drafts/${draftId}/`
    );
    return response.data;
  },

  // ----------------------------------------------------------
  // 4️⃣ Lista mina utkast
  // GET /api/jobrequests/drafts/
  // ----------------------------------------------------------
  async getMyDrafts() {
    const response = await axiosInstance.get("jobrequests/drafts/");
    return response.data;
  },

  // ----------------------------------------------------------
  // 5️⃣ Submit → Skapa riktig JobRequest
  // POST /api/jobrequests/drafts/<id>/submit/
  // ----------------------------------------------------------
  async submitDraft(draftId) {
    const response = await axiosInstance.post(
      `jobrequests/drafts/${draftId}/submit/`
    );
    return response.data;
  },
};

export default jobRequestDraftService;
