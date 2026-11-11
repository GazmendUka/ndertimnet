import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import api from "../api/axios";
import { billingService } from "../services/billingService";
import { startSession } from "../auth/session";
import { acceptContentRules } from "../auth/contentRules";
import { openExternalUrl, openPaymentUrl } from "./mobile";
import { appDestination } from "./iosAccess";

jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: jest.fn(), getPlatform: jest.fn() } }));
jest.mock("@capacitor/browser", () => ({ Browser: { open: jest.fn(), addListener: jest.fn(async () => ({ remove: jest.fn() })) } }));
let transport;
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(global, "crypto", { configurable: true, value: { randomUUID: () => "synthetic-session-id" } });
  Capacitor.isNativePlatform.mockReturnValue(true); Capacitor.getPlatform.mockReturnValue("ios");
  transport = jest.fn(async config => ({ status: 200, data: {}, headers: {}, config }));
  api.defaults.adapter = transport;
});

test.each([
  ["accounts/register/company/", true],
  ["/api/accounts/register/%63ompany/?source=link", true],
  ["billing/subscribe/", false], ["billing/buy-offer-pack/", false],
  ["billing/change-plan/", false], ["billing/offer-checkout/", false],
  ["https://ndertimnet-r5dt.onrender.com/api/billing/123/checkout/", false],
  ["payments/pay-job/", false],
])("iOS never sends restricted %s, including unauthenticated signup", async (url, skipAuth) => {
  await expect(api.post(url, {}, { skipAuth })).rejects.toMatchObject({ code: "ios_commerce_unavailable" });
  expect(transport).not.toHaveBeenCalled();
});

test("iOS still logs in, registers private customers and reads shared business entitlements", async () => {
  await api.post("accounts/register/customer/", {}, { skipAuth: true });
  await api.post("accounts/login/", {}, { skipAuth: true });
  await billingService.refreshStatus(); await billingService.subscription(); await billingService.history();
  await billingService.cancel();
  expect(transport).toHaveBeenCalledTimes(6);
});

test("a signed-in iOS company can still send an offer using its server-side entitlement", async () => {
  const session = startSession({ access: "synthetic-access", refresh: "synthetic-refresh" }, false);
  session.storage.setItem("user", JSON.stringify({ id: 101 })); acceptContentRules(101);
  await api.post("offers/7/sign/", { personal_number: "synthetic" });
  expect(transport).toHaveBeenCalledWith(expect.objectContaining({ url: "offers/7/sign/", headers: expect.objectContaining({ Authorization: "Bearer synthetic-access" }) }));
});

test.each(["web", "android"])("%s keeps its existing signup and billing requests", async platform => {
  Capacitor.isNativePlatform.mockReturnValue(platform !== "web"); Capacitor.getPlatform.mockReturnValue(platform);
  await api.post("accounts/register/company/", {}, { skipAuth: true });
  await billingService.subscribe("standard", "Synthetic", "v1");
  await billingService.buyPack("Synthetic", "v1", "key");
  expect(transport).toHaveBeenCalledTimes(3);
});

test("iOS never opens a bank checkout and does not follow its own purchase/signup links", async () => {
  await expect(openPaymentUrl("https://checkout.example.test/order", "/company/payments")).rejects.toThrow();
  for (const path of ["/register", "/register/company", "/pricing", "/company/payments"]) await openExternalUrl(`https://ndertimnet.com${path}`);
  expect(Browser.open).not.toHaveBeenCalled(); expect(Browser.addListener).not.toHaveBeenCalled();
  await openExternalUrl("https://ndertimnet.com/privacy.html");
  expect(Browser.open).toHaveBeenCalledWith(expect.objectContaining({ url: "https://ndertimnet.com/privacy.html" }));
});

test("Android's existing browser checkout is unaffected", async () => {
  Capacitor.getPlatform.mockReturnValue("android");
  await openPaymentUrl("https://checkout.example.test/order", "/company/payments");
  expect(Browser.open).toHaveBeenCalledWith(expect.objectContaining({ url: "https://checkout.example.test/order" }));
});

test("iOS incoming links retain offer access but cannot restore registration or pricing", () => {
  expect(appDestination("/register/company?from=link")).toBe("/login");
  expect(appDestination("/register/%63ompany/")).toBe("/login");
  expect(appDestination("/register")).toBe("/register/customer");
  expect(appDestination("/pricing?plan=pro")).toBe("/");
  expect(appDestination("/company/offers/7?from=push")).toBe("/company/offers/7?from=push");
});
