import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NativeSubscriptionBilling from "./NativeSubscriptionBilling";
import { billingService } from "../../services/billingService";
import { storeBillingService } from "../../services/storeBillingService";
jest.mock("@capacitor/app", () => ({ App: { addListener: jest.fn().mockResolvedValue({ remove: jest.fn() }) } }));
jest.mock("../../services/billingService", () => ({ billingService: { catalog: jest.fn(), subscription: jest.fn(), history: jest.fn(), cancel: jest.fn() } }));
jest.mock("../../services/storeBillingService", () => ({ storeBillingService: { config: jest.fn(), products: jest.fn(), terms: jest.fn(), recover: jest.fn(), buy: jest.fn(), changePlan: jest.fn(), listen: jest.fn() } }));
const products = [
  { code: "offers_3", identifier: "offers3", title: "Bazë", price: 249, currencyCode: "SEK", priceString: "249 kr" },
  { code: "standard", identifier: "standard", title: "Standard", price: 299, currencyCode: "SEK", priceString: "299 kr" },
  { code: "pro", identifier: "pro", title: "Pro", price: 599, currencyCode: "SEK", priceString: "599 kr" },
];
beforeEach(() => {
  jest.clearAllMocks();
  billingService.catalog.mockResolvedValue({ data: { offer_pack: { code: "offers_3", offers: 3, price: "19.95" }, plans: [{code:"standard",name:"Standard",offers:10},{code:"pro",name:"Pro",offers:30}] } });
  billingService.subscription.mockResolvedValue({ data: { subscription:null, agreements:[], overview:{monthly_offers_total:0,monthly_offers_remaining:0,credits_remaining:0,purchased_offers_remaining:0} } });
  billingService.history.mockResolvedValue({ data: [] });
  storeBillingService.config.mockResolvedValue({ data: {enabled:true,environment:"Sandbox",products:{}} });
  storeBillingService.products.mockResolvedValue(products);
  storeBillingService.recover.mockResolvedValue();
  storeBillingService.listen.mockResolvedValue({remove:jest.fn()});
  storeBillingService.terms.mockResolvedValue({data:{text:"Kushtet e dyqanit",version:"store-v1"}});
  storeBillingService.buy.mockResolvedValue({data:{status:"paid"}});
});
async function consent(name="Bazë") {
  fireEvent.click(await screen.findByRole("button",{name:`Zgjidh ${name}`}));
  await screen.findByLabelText("Konfirmimi i blerjes");
  fireEvent.change(screen.getByLabelText("Emri i plotë i përfaqësuesit"),{target:{value:"Test Person"}});
  fireEvent.click(screen.getByRole("checkbox"));
}
test("store prices and shared quotas replace hardcoded euro prices and bank links", async()=>{
  render(<NativeSubscriptionBilling/>);
  await screen.findByRole("button",{name:"Zgjidh Bazë"});
  expect(screen.getByText("249 kr")).toBeInTheDocument();
  expect(screen.getByText(/3 oferta pa afat skadimi/)).toBeInTheDocument();
  expect(screen.getByText(/30 oferta në muaj/)).toBeInTheDocument();
  expect(screen.queryByText(/19.95/)).not.toBeInTheDocument();
  expect(screen.queryAllByRole("link")).toHaveLength(0);
});
test("consent is required and success refreshes balance without bank navigation",async()=>{
  render(<NativeSubscriptionBilling/>);
  fireEvent.click(await screen.findByRole("button",{name:"Zgjidh Bazë"}));
  expect(await screen.findByRole("button",{name:"Përfundo blerjen · 249 kr"})).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Emri i plotë i përfaqësuesit"),{target:{value:"Test Person"}});
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button",{name:"Përfundo blerjen · 249 kr"}));
  expect(await screen.findByText(/Pagesa u verifikua/)).toBeInTheDocument();
  expect(storeBillingService.buy).toHaveBeenCalledWith(products[0],"Test Person","store-v1",undefined);
  expect(billingService.subscription.mock.calls.length).toBeGreaterThan(1);
});
test("unavailable store hides purchase buttons rather than offering bank checkout",async()=>{
  storeBillingService.config.mockResolvedValue({data:{enabled:false}});
  render(<NativeSubscriptionBilling/>);
  await screen.findByText(/Blerjet në aplikacion nuk janë aktivizuar/);
  expect(screen.queryByRole("button",{name:/Zgjidh/})).not.toBeInTheDocument();
  expect(storeBillingService.products).not.toHaveBeenCalled();
});
test("failed verification preserves visible error and never reports a successful purchase",async()=>{
  storeBillingService.buy.mockRejectedValue(new Error("Pagesa pret verifikimin"));
  render(<NativeSubscriptionBilling/>);await consent();
  fireEvent.click(screen.getByRole("button",{name:"Përfundo blerjen · 249 kr"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Pagesa pret verifikimin");
  expect(screen.queryByText(/Pagesa u verifikua/)).not.toBeInTheDocument();
});
test("already paid monthly plan cannot trigger another immediate payment",async()=>{
  billingService.subscription.mockResolvedValue({data:{subscription:{plan_code:"standard",monthly_offers:10,started_at:"2026-11-01",periods:[]}}});
  render(<NativeSubscriptionBilling/>);await screen.findByRole("button",{name:"Ndrysho në Pro"});
  expect(screen.queryByRole("button",{name:"Zgjidh Standard"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Ndrysho në Pro"}));
  expect(await screen.findByText(/Nuk kryhet pagesë sot/)).toBeInTheDocument();
});
test("finishing a pending pack uses its charge instead of creating a second purchase",async()=>{
  billingService.history.mockResolvedValue({data:[{id:7,kind:"offer_pack",payable:true,status:"pending",amount:"19.95"}]});
  render(<NativeSubscriptionBilling/>);
  fireEvent.click(await screen.findByRole("button",{name:"Përfundo pagesën · 249 kr"}));
  expect(storeBillingService.terms).toHaveBeenCalledWith(products[0],7);
  await screen.findByLabelText("Konfirmimi i blerjes");
});
test("recovering purchases after a restart refreshes shared server state",async()=>{
  render(<NativeSubscriptionBilling/>);
  await waitFor(()=>expect(storeBillingService.recover).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button",{name:"Përditëso blerjet"}));
  expect(await screen.findByText("Statusi i blerjeve u përditësua.")).toBeInTheDocument();
  expect(storeBillingService.recover).toHaveBeenCalledTimes(2);
});
