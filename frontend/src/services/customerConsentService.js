import axiosInstance from "../api/axios";

const customerConsentService = {
  submitConsent(data) {
    return axiosInstance.post("/accounts/customer-consent/", data);
  },
};

export default customerConsentService;