import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ListingPrice, OfferBilling, SubscriptionBilling, PublicationBilling, PublicSubscriptionPricing } from "./PlatformBilling";
import { billingService, isNativeBilling } from "../../services/billingService";
jest.mock("react-router-dom", () => ({ Link: ({ children, to }) => <a href={to}>{children}</a> }));
jest.mock("../../platform/mobile", () => ({ openPaymentUrl: jest.fn() }));
jest.mock("../../services/billingService", () => ({ isNativeBilling: jest.fn(), billingService: { catalog: jest.fn(), history: jest.fn(), subscription: jest.fn(), offerQuote: jest.fn(), subscribe: jest.fn(), terms: jest.fn(), cancel: jest.fn(), changePlan: jest.fn(), checkout: jest.fn() } }));
const plans = [{ code: "standard", name: "Standard", monthly_price: "29.00", regular_price: "49.00", offers: 10 }, { code: "pro", name: "Pro", monthly_price: "59.00", regular_price: "79.00", offers: 30 }];
beforeEach(() => {
 jest.clearAllMocks(); isNativeBilling.mockReturnValue(false);
 billingService.catalog.mockResolvedValue({ data: { bank_payments_available: true, plans, listing: { regular_price: "3.95", discount: "3.95", payable: "0.00", introductory_free: true } } });
 billingService.subscription.mockResolvedValue({ data: { subscription: null } });
 billingService.terms.mockResolvedValue({ data: { text: "Marrëveshja", version: "v1" } });
 billingService.history.mockResolvedValue({ data: [] });
});
test("public tiers use catalog price, quotas, deadline and no per-offer fee", async () => {
 render(<PublicSubscriptionPricing />); await screen.findByText("Standard");
 expect(screen.getByText("Pro")).toBeInTheDocument();
 expect(screen.getByText(/10 oferta në muaj/)).toBeInTheDocument();
 expect(screen.getByText(/30 oferta në muaj/)).toBeInTheDocument();
 expect(screen.getByText(/49.00.*1 janarit 2027/)).toBeInTheDocument();
 expect(screen.getByText(/79.00.*1 janarit 2027/)).toBeInTheDocument();
 expect(screen.getAllByText(/Pa afat detyrues. Pa pagesë/)).toHaveLength(2);
});
test("regular prices hide expired promotion", async () => {
 billingService.catalog.mockResolvedValue({ data: { plans: plans.map(p => ({ ...p, monthly_price: p.regular_price })) } });
 render(<PublicSubscriptionPricing />); await screen.findByText("Standard"); expect(screen.queryByText(/Çmim hyrës/)).not.toBeInTheDocument();
});
test("bank unavailable disables enrollment", async () => {
 billingService.catalog.mockResolvedValue({ data: { plans, bank_payments_available: false } });
 render(<SubscriptionBilling />); expect(await screen.findByRole("button", { name: "Zgjidh Standard" })).toBeDisabled();
});
test("quota exhaustion never offers an individual purchase", async () => {
 billingService.offerQuote.mockResolvedValue({ data: { subscription_required: true } });
 render(<OfferBilling offerId={1} />); await screen.findByText(/Zgjidhni një abonim ose prisni/); expect(screen.queryByRole("button", { name: /Paguaj/ })).not.toBeInTheDocument();
});
test("native flow exposes no external purchase", async () => {
 isNativeBilling.mockReturnValue(true); render(<SubscriptionBilling />); await screen.findByText("Standard");
 expect(screen.queryByRole("button", { name: /Zgjidh/ })).not.toBeInTheDocument(); expect(screen.queryByRole("link", { name: /Regjistro/ })).not.toBeInTheDocument();
});
test("name and consent required for subscription", async () => {
 billingService.subscribe.mockResolvedValue({ data: {} }); render(<SubscriptionBilling />);
 fireEvent.click(await screen.findByRole("button", { name: "Zgjidh Standard" }));
 const sign = await screen.findByRole("button", { name: "Nënshkruaj dhe vazhdo te pagesa" }); expect(sign).toBeDisabled();
 fireEvent.click(screen.getByRole("checkbox")); expect(sign).toBeDisabled();
 fireEvent.change(screen.getByLabelText("Emri i plotë i përfaqësuesit"), { target: { value: "Test Person" } }); fireEvent.click(sign);
 await waitFor(() => expect(billingService.subscribe).toHaveBeenCalledWith("standard", "Test Person", "v1"));
});
test("plan change signs terms for next period", async () => {
 billingService.subscription.mockResolvedValue({ data: { subscription: { plan_code: "standard", monthly_offers: 10, started_at: "2026-10-01", periods: [] } } });
 billingService.changePlan.mockResolvedValue({ data: {} }); render(<SubscriptionBilling />);
 fireEvent.click(await screen.findByRole("button", { name: "Zgjidh Pro" }));
 const change = await screen.findByRole("button", { name: "Konfirmo ndryshimin për periudhën tjetër" });
 fireEvent.click(screen.getByRole("checkbox")); fireEvent.change(screen.getByLabelText("Emri i plotë i përfaqësuesit"), { target: { value: "Test Person" } }); fireEvent.click(change);
 await waitFor(() => expect(billingService.changePlan).toHaveBeenCalledWith("pro", "Test Person", "v1"));
});
test("historical pending payment keeps verification message", async () => {
 billingService.offerQuote.mockResolvedValue({ data: { pending: true } }); render(<OfferBilling offerId={1} />); expect(await screen.findByText(/Pagesa e mëparshme po verifikohet/)).toBeInTheDocument();
});
test("publication price remains separate", async () => { render(<ListingPrice />); expect(await screen.findByText(/Për të paguar tani: 0.00/)).toBeInTheDocument(); });
test("archived agreement remains downloadable", async () => {
 billingService.subscription.mockResolvedValue({ data: { subscription: null, agreements: [{ text: "Archived contract", signed_at: "2026-01-01", signer_name: "Test Person", sha256: "hash" }] } });
 render(<SubscriptionBilling />); await screen.findByText("Archived contract"); expect(screen.getByRole("link", { name: "Shkarko kopjen" })).toHaveAttribute("download");
});
