import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ListingPrice, OfferBilling, SubscriptionBilling, PublicationBilling, PublicSubscriptionPricing } from "./PlatformBilling";
import { billingService, isNativeBilling } from "../../services/billingService";
jest.mock("react-router-dom", () => ({ Link: ({ children, to }) => <a href={to}>{children}</a> }));
jest.mock("../../platform/mobile", () => ({ openPaymentUrl: jest.fn() }));
jest.mock("../../services/billingService", () => ({ isNativeBilling: jest.fn(), billingService: { catalog: jest.fn(), refreshStatus: jest.fn(), history: jest.fn(), subscription: jest.fn(), offerQuote: jest.fn(), subscribe: jest.fn(), terms: jest.fn(), packTerms: jest.fn(), buyPack: jest.fn(), cancel: jest.fn(), changePlan: jest.fn(), checkout: jest.fn() } }));
const plans = [{ code: "standard", name: "Standard", monthly_price: "29.00", regular_price: "49.00", offers: 10 }, { code: "pro", name: "Pro", monthly_price: "59.00", regular_price: "79.00", offers: 30 }];
beforeEach(() => {
 billingService.refreshStatus.mockResolvedValue({ data: {} });
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
 expect(screen.getAllByText(/Pagesë mujore. Pa afat detyrues./)).toHaveLength(2);
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
 render(<OfferBilling offerId={1} />); await screen.findByText(/Kuota është shteruar/); expect(screen.queryByRole("button", { name: /Paguaj/ })).not.toBeInTheDocument();
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

test("selecting a plan scrolls to and focuses agreement", async () => {
 const scroll = jest.fn(); Element.prototype.scrollIntoView = scroll;
 render(<SubscriptionBilling />);
 fireEvent.click(await screen.findByRole("button", { name: "Zgjidh Pro" }));
 const agreement = await screen.findByLabelText("Konfirmimi i abonimit");
 await waitFor(() => expect(agreement).toHaveFocus());
 expect(scroll).toHaveBeenCalled();
 delete Element.prototype.scrollIntoView;
});

test("checkout failure refreshes persisted subscription and keeps visible error", async () => {
 billingService.subscribe.mockRejectedValue({ response: { data: { detail: "Bank checkout unavailable" } } });
 render(<SubscriptionBilling />);
 fireEvent.click(await screen.findByRole("button", { name: "Zgjidh Pro" }));
 await screen.findByLabelText("Emri i plotë i përfaqësuesit");
 billingService.subscription.mockResolvedValue({ data: { subscription: { plan_code: "pro", monthly_offers: 30, started_at: null, periods: [] } } });
 fireEvent.change(screen.getByLabelText("Emri i plotë i përfaqësuesit"), { target: { value: "Test Person" } });
 fireEvent.click(screen.getByRole("checkbox"));
 fireEvent.click(screen.getByRole("button", { name: "Nënshkruaj dhe vazhdo te pagesa" }));
 expect(await screen.findByRole("alert")).toHaveTextContent("Bank checkout unavailable");
 expect(screen.getByText(/Abonimi nuk është aktivizuar ende/)).toBeInTheDocument();
 expect(screen.queryByRole("button", { name: "Zgjidh Pro" })).not.toBeInTheDocument();
});


test("one time pack shows 19.95 and purchases separately from subscriptions", async () => {
 billingService.catalog.mockResolvedValue({ data: { bank_payments_available: true, plans, offer_pack: { code: "offers_3", name: "Paketa 3 oferta", price: "19.95", offers: 3 } } });
 billingService.packTerms.mockResolvedValue({ data: { text: "Pa afat skadimi", version: "pack-v1", purchase_key: "synthetic-key" } });
 billingService.buyPack.mockResolvedValue({ data: {} });
 render(<SubscriptionBilling />);
 fireEvent.click(await screen.findByRole("button", { name: "Zgjidh Bazë" }));
 expect(await screen.findByText(/Bazë: 19.95/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText("Emri i plotë i përfaqësuesit"), { target: { value: "Test Person" } });
 fireEvent.click(screen.getByRole("checkbox"));
 fireEvent.click(screen.getByRole("button", { name: "Nënshkruaj dhe vazhdo te pagesa" }));
 await waitFor(() => expect(billingService.buyPack).toHaveBeenCalledWith("Test Person", "pack-v1", "synthetic-key"));
 expect(billingService.subscribe).not.toHaveBeenCalled();
 expect(billingService.changePlan).not.toHaveBeenCalled();
});

test("standard consent displays its own 29 euro price", async () => {
 render(<SubscriptionBilling />);
 fireEvent.click(await screen.findByRole("button", { name: "Zgjidh Standard" }));
 expect(await screen.findByText("Standard: 29.00 € / muaj")).toBeInTheDocument();
 expect(screen.queryByText("Pro: 59.00 € / muaj")).not.toBeInTheDocument();
});


test("canceled test price is folded into history and is not a payable purchase", async () => {
 billingService.history.mockResolvedValue({ data: [{ id: 5, kind: "subscription", type_display: "Abonimi mujor", amount: "59.00", status: "canceled", payable: false, created_at: "2026-11-04" }] });
 render(<SubscriptionBilling />);
 await screen.findByText("Historiku i pagesave (1)");
 expect(screen.getByRole("group", { name: "Historiku i pagesave" })).not.toHaveAttribute("open");
 expect(screen.queryByRole("button", { name: "Paguaj 59.00 €" })).not.toBeInTheDocument();
 expect(screen.queryByText("Pagesa në pritje të përfundimit")).not.toBeInTheDocument();
 expect(screen.getByRole("button", { name: "Përditëso statusin" })).toBeInTheDocument();
});

test("unfinished purchase remains available outside folded history", async () => {
 billingService.history.mockResolvedValue({ data: [{ id: 6, kind: "offer_pack", type_display: "Paketa", amount: "19.95", status: "pending", payable: true }] });
 render(<SubscriptionBilling />);
 expect(await screen.findByRole("button", { name: "Paguaj 19.95 €" })).toBeVisible();
 expect(screen.getByText("Pagesa në pritje të përfundimit")).toBeVisible();
});

test("payment refresh verifies bank before loading balances", async () => {
 render(<SubscriptionBilling />); await screen.findByText("Standard");
 expect(billingService.refreshStatus).toHaveBeenCalledTimes(1);
 expect(billingService.refreshStatus.mock.invocationCallOrder[0]).toBeLessThan(billingService.history.mock.invocationCallOrder[0]);
 fireEvent.click(screen.getByRole("button", { name: "Përditëso statusin" }));
 await waitFor(() => expect(billingService.refreshStatus).toHaveBeenCalledTimes(2));
});
