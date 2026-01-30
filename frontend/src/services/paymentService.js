// frontend/src/services/paymentService.js

import api from "../api/axios";

const paymentService = {
  buyOfferAccess(jobRequestId) {
    return api.post(`/payments/offer-access/${jobRequestId}/`);
  },

  buyChatAccess(leadId) {
    return api.post(`/payments/chat-access/${leadId}/`);
  },
};

export default paymentService;
