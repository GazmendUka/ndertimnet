import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ListingPrice, OfferBilling, SubscriptionBilling, PublicationBilling } from "./PlatformBilling";
import { billingService, isNativeBilling } from "../../services/billingService";

jest.mock("react-router-dom", () => ({ Link: ({ children }) => <span>{children}</span> }));
jest.mock("../../platform/mobile", () => ({ openPaymentUrl: jest.fn() }));
jest.mock("../../services/billingService", () => ({
  isNativeBilling: jest.fn(),
  billingService: { catalog: jest.fn(), history: jest.fn(), subscription: jest.fn(), offerQuote: jest.fn(), offerCheckout: jest.fn(), subscribe: jest.fn(), terms: jest.fn(), credits: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  isNativeBilling.mockReturnValue(false);
  billingService.catalog.mockResolvedValue({ data: {
    listing: { regular_price: "3.95", discount: "3.95", payable: "0.00", introductory_free: true },
    plans: [{ code: "offers_3", monthly_price: "39.95", offers: 3 }],
  } });
  billingService.subscription.mockResolvedValue({ data: { subscription: null } });
  billingService.terms.mockResolvedValue({ data: { text: "Marrëveshja e abonimit", version: "v1" } });
  billingService.credits.mockResolvedValue({ data: [] });
  billingService.history.mockResolvedValue({ data: [] });
});

test("publication displays both planned price and zero introductory amount", async () => {
  render(<ListingPrice />);
  expect(await screen.findByText(/Për të paguar tani: 0.00/)).toBeInTheDocument();
  expect(screen.getByText(/Çmimi i planifikuar: 3.95/)).toBeInTheDocument();
});

test("paid publication confirms payment without inventing a moderation state", async () => {
  billingService.history.mockResolvedValue({ data: [{ id: 1, job_request_id: 1, status: 'paid', amount: '0.00' }] });
  render(<PublicationBilling jobId={1} />);
  expect(await screen.findByText('Tarifa e publikimit është përfunduar.')).toBeInTheDocument();
  expect(screen.queryByText(/i nënshtrohet shqyrtimit/)).not.toBeInTheDocument();
});

test("unconfigured bank prevents subscription signing and explains free availability", async () => {
  billingService.catalog.mockResolvedValue({ data: {
    bank_payments_available: false,
    plans: [{ code: "offers_3", monthly_price: "39.95", offers: 3 }],
  } });
  render(<SubscriptionBilling />);
  expect(await screen.findByText(/Pagesat bankare dhe abonimet nuk janë aktivizuar/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Zgjidh planin" })).toBeDisabled();
});

test("unconfigured bank does not offer a paid checkout", async () => {
  billingService.offerQuote.mockResolvedValue({ data: { fee: "19.95", bank_payments_available: false } });
  render(<OfferBilling offerId={1} />);
  expect(await screen.findByText(/Nuk mund të dërgoni oferta me pagesë/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Paguaj/ })).not.toBeInTheDocument();
});

test("native offer flow does not offer an external purchase", async () => {
  isNativeBilling.mockReturnValue(true);
  billingService.offerQuote.mockResolvedValue({ data: { fee: "19.95", paid: false, included: false } });
  render(<OfferBilling offerId={1} />);
  expect(await screen.findByText(/Blerjet në aplikacion/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Paguaj/ })).not.toBeInTheDocument();
});

test("subscription requires explicit consent before choosing plan", async () => {
  billingService.subscribe.mockResolvedValue({ data: {} });
  render(<SubscriptionBilling />);
  const button = await screen.findByRole("button", { name: "Zgjidh planin" });
  fireEvent.click(button);
  const sign = await screen.findByRole("button", { name: "Nënshkruaj dhe vazhdo te pagesa" });
  expect(sign).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(sign).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Emri i plotë i përfaqësuesit"), { target: { value: "Test Person" } });
  expect(sign).toBeEnabled();
  fireEvent.click(sign);
  await waitFor(() => expect(billingService.subscribe).toHaveBeenCalledWith("offers_3", "Test Person", "v1"));
});

test("paid offer shows that signing is still required", async () => {
  billingService.offerQuote.mockResolvedValue({ data: { fee: "19.95", paid: true } });
  render(<OfferBilling offerId={1} />);
  expect(await screen.findByText(/Tarifa është paguar/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Paguaj/ })).not.toBeInTheDocument();
});


test("introductory offer displays remaining allowance and no payment button", async () => {
  billingService.offerQuote.mockResolvedValue({ data: { fee: "19.95", introductory: true, free_offers_remaining: 25 } });
  render(<OfferBilling offerId={1} />);
  expect(await screen.findByText(/25 ofertat hyrëse/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Paguaj/ })).not.toBeInTheDocument();
  expect(screen.getByText(/Biseda dhe kontaktet hapen pasi dërgoni ofertën/)).toBeInTheDocument();
});

test("subscription page shows one-time free offers before plan purchase", async () => {
  billingService.subscription.mockResolvedValue({ data: { subscription: null, free_offers_remaining: 24 } });
  render(<SubscriptionBilling />);
  expect(await screen.findByText(/24 nga 25 ofertat falas/)).toBeInTheDocument();
  expect(screen.getByText(/Mund të prisni derisa të mbarojnë/)).toBeInTheDocument();
});


test("price increase shows only the additional fee on the payment button", async () => {
  billingService.offerQuote.mockResolvedValue({ data: {
    fee: "3.00", total_fee: "5.95", already_paid: "2.95", adjustment: true,
    paid: false, included: false, introductory: false,
  } });
  render(<OfferBilling offerId={1} />);
  expect(await screen.findByRole("button", { name: "Paguaj 3.00 €" })).toBeInTheDocument();
  expect(screen.getByText(/Paguar më parë: 2.95/)).toBeInTheDocument();
  expect(screen.getByText(/kontaktet hapen pasi dërgoni ofertën/)).toBeInTheDocument();
});


test("plans disclose comparable individual costs", async () => {
  render(<SubscriptionBilling />);
  expect(await screen.findByText(/8.85–59.85/)).toBeInTheDocument();
  expect(screen.getByText(/13.32 € për ofertë/)).toBeInTheDocument();
});

test("signed contract remains available after the subscription ends", async () => {
  billingService.subscription.mockResolvedValue({ data: { subscription: null, agreements: [{ subscription_id: 4, text: "Archived contract", signed_at: "2026-01-01T00:00:00Z", signer_name: "Test Person", sha256: "hash" }] } });
  render(<SubscriptionBilling />);
  expect(await screen.findByText("Archived contract")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Shkarko kopjen" })).toHaveAttribute("download", "marreveshja-4.txt");
});


test("credit replaces payment button and shows remaining balance", async () => {
  billingService.offerQuote.mockResolvedValue({ data: { fee: "19.95", credit_available: true, credits_remaining: 2 } });
  render(<OfferBilling offerId={1} />);
  expect(await screen.findByText(/Përdoret një kredit oferte/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Paguaj/ })).not.toBeInTheDocument();
});

test("ended subscription still offers payment of outstanding monthly charges", async () => {
  billingService.subscription.mockResolvedValue({ data: { subscription: { ends_at: "2020-01-01", periods: [] } } });
  billingService.history.mockResolvedValue({ data: [{ id: 17, kind: "subscription", subscription_id: 3, payable: true, status: "pending", amount: "39.95", period_starts_at: "2019-12-01", period_ends_at: "2020-01-01" }] });
  render(<SubscriptionBilling />);
  expect(await screen.findByRole("button", { name: "Paguaj 39.95 €" })).toBeInTheDocument();
  expect(screen.getByText(/Abonimi #3/)).toBeInTheDocument();
});

test("canceled unstarted subscription does not offer collection", async () => {
  billingService.history.mockResolvedValue({ data: [{ id: 17, kind: "subscription", payable: false, status: "pending", amount: "39.95" }] });
  render(<SubscriptionBilling />);
  expect(await screen.findByText("Nuk ka pagesa mujore të papaguara.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Paguaj/ })).not.toBeInTheDocument();
});

test("overview shows usable allowance, next monthly amount and cancellation date", async () => {
  billingService.subscription.mockResolvedValue({ data: { subscription: null, overview: {
    state: "ending", free_offers_remaining: 8, credits_remaining: 1,
    monthly_offers_remaining: 3, monthly_offers_total: 5,
    period_ends_at: "2026-10-23T12:00:00Z", next_payment_due_at: "2026-10-23T12:00:00Z",
    next_payment_amount: "54.95", outstanding_amount: "0.00", ends_at: "2027-01-23T12:00:00Z"
  } } });
  render(<SubscriptionBilling />);
  expect(await screen.findByLabelText("Përmbledhja e pagesave")).toBeInTheDocument();
  expect(screen.getByText("3 / 5")).toBeInTheDocument();
  expect(screen.getByText(/Pagesa e radhës/)).toHaveTextContent("54.95 €");
  expect(screen.getByText(/Data e përfundimit të abonimit/)).toBeInTheDocument();
});
