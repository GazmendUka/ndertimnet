import api from "../api/axios";
import { Capacitor } from "@capacitor/core";

export const isNativeBilling = () => Capacitor.isNativePlatform();
const platform = () => isNativeBilling() ? Capacitor.getPlatform() : "web";
export const billingService = {
  catalog: () => api.get("billing/catalog/"),
  history: () => api.get("billing/history/"),
  offerQuote: (offer) => api.get("billing/offer-quote/", { params: { offer } }),
  offerCheckout: (offer) => api.post("billing/offer-checkout/", { offer, platform: platform() }),
  subscription: () => api.get("billing/subscription/"),
  terms: (plan) => api.get("billing/subscription-terms/", { params: { plan } }),
  credits: () => api.get("billing/credits/"),
  subscribe: (plan, signer_name, terms_version) => api.post("billing/subscribe/", { plan, signer_name, terms_version, accept_notice: true, platform: platform() }),
  changePlan: (plan, signer_name, terms_version) => api.post("billing/change-plan/", { plan, signer_name, terms_version, accept_notice: true }),
  cancel: () => api.post("billing/cancel-subscription/"),
  checkout: (id) => api.post(`billing/${id}/checkout/`, { platform: platform() }),
};
