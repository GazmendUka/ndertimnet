import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import api from "../api/axios";

const platform = () => Capacitor.getPlatform();
let purchaseRunning = false;
let recoveryRunning = null;
const finishingTransactions = new Map();

async function finishVerifiedTransaction(transaction) {
  if (platform() !== "ios") return;
  const key = transaction.transactionId;
  if (!finishingTransactions.has(key)) finishingTransactions.set(key,
    NativePurchases.finishTransaction({ transactionId: key }).catch(e => { finishingTransactions.delete(key); throw e; }));
  await finishingTransactions.get(key);
}

export const storeBillingService = {
  config: () => api.get("billing/store-config/", { params: { platform: platform() } }),
  terms: (product, chargeId) => api.get("billing/store-terms/", { params: {
    platform: platform(), code: product.code, amount: String(product.price), currency: product.currencyCode, charge_id: chargeId,
  } }),
  changePlan: (product, signer, version) => api.post("billing/change-plan/", {
    plan: product.code, code: product.code, platform: platform(), amount: String(product.price), currency: product.currencyCode,
    signer_name: signer, terms_version: version, accept_notice: true,
  }),
  async products(config) {
    if (!Capacitor.isNativePlatform() || !config.enabled) return [];
    await NativePurchases.configure({ autoFinishTransactions: false });
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    if (!isBillingSupported) throw new Error("Blerjet nuk mbështeten në këtë pajisje.");
    const { products } = await NativePurchases.getProducts({ productIdentifiers: Object.values(config.products), productType: PURCHASE_TYPE.INAPP });
    return Object.entries(config.products).flatMap(([code, id]) => {
      const product = products.find(p => p.identifier === id);
      return product && product.priceString && Number(product.price) > 0 && product.currencyCode
        ? [{ ...product, code }] : [];
    });
  },
  async verify(transaction) {
    const id = transaction.appAccountToken;
    const reference = platform() === "ios" ? transaction.transactionId : transaction.purchaseToken;
    if (!id || !reference) throw new Error("Blerja nuk mund të lidhet me kompaninë. Kontaktoni mbështetjen.");
    let result;
    try { result = await api.post("billing/store-verify/", { id, reference }); }
    catch (e) {
      if (e.response?.status === 409 && e.response?.data?.status === "refunded") {
        // The server has authenticated this revocation and persisted the lost quota.
        await finishVerifiedTransaction(transaction);
        const revoked = new Error(e.response.data.detail || "Pagesa është rimbursuar. Kuota është përditësuar.");
        revoked.revoked = true;
        throw revoked;
      }
      throw e;
    }
    if (result.data.status !== "paid") throw new Error(result.data.detail || "Pagesa pret verifikimin. Mos blini sërish.");
    // Google is consumed/acknowledged by the server after the entitlement is durable.
    await finishVerifiedTransaction(transaction);
    return result;
  },
  async recover() {
    if (recoveryRunning) return recoveryRunning;
    recoveryRunning = (async () => {
      await NativePurchases.configure({ autoFinishTransactions: false });
      const { transactions } = await NativePurchases.getUnfinishedTransactions();
      for (const transaction of transactions) {
        try { await storeBillingService.verify(transaction); }
        catch (e) {
          // Purchases from another signed-in company must not transfer or be finished.
          if (e.response?.status !== 404 && !e.revoked) throw e;
        }
      }
    })();
    try { await recoveryRunning; } finally { recoveryRunning = null; }
  },
  async buy(product, signer, termsVersion, chargeId) {
    if (purchaseRunning) throw new Error("Një blerje tjetër po përpunohet.");
    purchaseRunning = true;
    let intent;
    try {
      await storeBillingService.recover();
      const result = await api.post("billing/store-prepare/", {
        platform: platform(), code: product.code, amount: String(product.price), currency: product.currencyCode,
        signer_name: signer, terms_version: termsVersion, accept_notice: true, charge_id: chargeId,
      });
      intent = result.data;
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: intent.product_id, productType: PURCHASE_TYPE.INAPP,
        quantity: 1, appAccountToken: intent.id,
        offerToken: product.offerToken,
        isConsumable: false, autoAcknowledgePurchases: false,
      });
      return await storeBillingService.verify(transaction);
    } catch (e) {
      if (intent && (["1", "USER_CANCELLED", "USER_CANCELED", "PURCHASE_CANCELLED", "userCancelled"].includes(String(e.code)) || e.message === "User cancelled")) {
        await api.post("billing/store-cancel/", { id: intent.id });
        const canceled = new Error("Blerja u anulua. Nuk është shtuar kuotë.");
        canceled.canceled = true;
        throw canceled;
      }
      throw e;
    } finally { purchaseRunning = false; }
  },
  async listen(onChange) {
    if (platform() !== "ios") return { remove() {} };
    return NativePurchases.addListener("transactionUpdated", async transaction => {
      try { await storeBillingService.verify(transaction); onChange(); } catch (e) { if (e.revoked) onChange(); /* Invalid purchases are never finished. */ }
    });
  },
};
