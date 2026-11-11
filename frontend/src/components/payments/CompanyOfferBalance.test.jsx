import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Capacitor } from "@capacitor/core";
import { SubscriptionBilling, PublicSubscriptionPricing, PricingPlans, OfferBilling } from "./PlatformBilling";
import { billingService } from "../../services/billingService";

jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: jest.fn(() => "ios") } }));
jest.mock("react-router-dom", () => ({ Link: ({ children, to }) => <a href={to}>{children}</a> }));
jest.mock("../../platform/mobile", () => ({ openPaymentUrl: jest.fn() }));
jest.mock("../../services/billingService", () => ({ isNativeBilling: () => true, billingService: { refreshStatus: jest.fn(), subscription: jest.fn(), history: jest.fn(), catalog: jest.fn(), subscribe: jest.fn(), buyPack: jest.fn(), changePlan: jest.fn(), checkout: jest.fn(), cancel: jest.fn(), offerQuote: jest.fn() } }));
const overview = { monthly_offers_remaining: 7, monthly_offers_total: 10, free_offers_remaining: 20, introductory_offers_granted: 20, purchased_offers_remaining: 3, credits_remaining: 2 };
beforeEach(() => {
  jest.clearAllMocks(); Capacitor.getPlatform.mockReturnValue("ios");
  billingService.refreshStatus.mockResolvedValue({ data: {} });
  billingService.subscription.mockResolvedValue({ data: { overview, subscription: { plan_code: "standard", monthly_offers: 10, started_at: "2026-11-01" }, agreements: [{ text: "Existing signed agreement", signed_at: "2026-11-01", signer_name: "Synthetic", sha256: "test" }] } });
  billingService.history.mockResolvedValue({ data: [{ id: 1, type_display: "Abonimi", amount: "29.00", status: "paid", created_at: "2026-11-01" }, { id: 2, type_display: "Paketa", amount: "19.95", status: "pending", payable: true }] });
});

test("iOS retains current monthly, free, package and compensation allowances without a storefront", async () => {
  render(<SubscriptionBilling />);
  expect(await screen.findByText("7 / 10")).toBeInTheDocument();
  expect(screen.getByText("20 nga 20 të mbetura")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument(); expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("Historiku i pagesave (2)")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Shkarko kopjen" })).toHaveAttribute("download");
  expect(screen.queryByText(/Zgjidhni një paketë|Blerjet në aplikacion|Paguaj|Regjistro kompaninë/)).not.toBeInTheDocument();
  expect(billingService.catalog).not.toHaveBeenCalled();
  expect(billingService.subscribe).not.toHaveBeenCalled(); expect(billingService.buyPack).not.toHaveBeenCalled();
});

test("returning to iOS reconciles independently purchased quota before updating the balance", async () => {
  render(<SubscriptionBilling />); await screen.findByText("7 / 10");
  billingService.subscription.mockResolvedValue({ data: { overview: { ...overview, monthly_offers_remaining: 30, monthly_offers_total: 30 } } });
  fireEvent(window, new Event("ndertimnet:account-refresh"));
  await screen.findByText("30 / 30");
  expect(billingService.refreshStatus).toHaveBeenCalledTimes(2);
  expect(billingService.refreshStatus.mock.invocationCallOrder[1]).toBeLessThan(billingService.subscription.mock.invocationCallOrder[1]);
  expect(billingService.checkout).not.toHaveBeenCalled();
});

test("iOS keeps subscription cancellation without offering upgrades or new purchases", async () => {
  billingService.cancel.mockResolvedValue({ data: {} });
  render(<SubscriptionBilling />); fireEvent.click(await screen.findByRole("button", { name: "Anulo abonimin" }));
  fireEvent.click(screen.getByRole("button", { name: "Konfirmo anulimin" }));
  await waitFor(() => expect(billingService.cancel).toHaveBeenCalledTimes(1));
  expect(billingService.subscribe).not.toHaveBeenCalled(); expect(billingService.changePlan).not.toHaveBeenCalled();
});

test("public pricing cannot expose enrollment even when rendered directly on iOS", () => {
  const { container } = render(<><PublicSubscriptionPricing /><PricingPlans catalog={{ plans: [{ code: "pro", name: "Pro", monthly_price: "59.00", offers: 30 }] }} /></>);
  expect(container).toBeEmptyDOMElement(); expect(billingService.catalog).not.toHaveBeenCalled();
});

test("iOS exhausted quota explains availability without a purchase link", async () => {
  billingService.offerQuote.mockResolvedValue({ data: { subscription_required: true } });
  render(<OfferBilling offerId={7} />);
  await screen.findByText(/Nuk keni kuotë të disponueshme/);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
