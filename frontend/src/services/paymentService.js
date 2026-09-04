// frontend/src/services/paymentService.js

import api from "../api/axios";
import { Capacitor } from "@capacitor/core";

const paymentService = {
  unlockLead(jobRequestId) {
    return api.post("/payments/unlock-lead/", {
      job_request: jobRequestId,
      platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web",
    });
  },

  getLeadUnlockStatus(jobRequestId) {
    return api.get("/payments/status/", {
      params: { job_request: jobRequestId },
    });
  },

  payAcceptedOffer(offerId) {
    return api.post("/payments/pay-job/", { offer: offerId });
  },

  getJobPaymentStatus(offerId) {
    return api.get("/payments/job-status/", {
      params: { offer: offerId },
    });
  },

  getHistory() {
    return api.get("/payments/history/");
  },

  getReceipt(paymentId) {
    return api.get(`/payments/${paymentId}/receipt/`);
  },
};

export default paymentService;
