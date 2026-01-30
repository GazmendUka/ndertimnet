import axiosInstance from "../api/axios"; // korrekt axios-instans

const customerConsentService = {
  submitConsent(data) {
    return axiosInstance.post("/accounts/customer/consent/", data);
  },
};

export default customerConsentService;
