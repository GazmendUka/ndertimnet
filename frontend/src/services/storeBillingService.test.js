import { Capacitor } from "@capacitor/core";
import { NativePurchases } from "@capgo/native-purchases";
import api from "../api/axios";
import { storeBillingService } from "./storeBillingService";
jest.mock("@capacitor/core",()=>({Capacitor:{getPlatform:jest.fn(),isNativePlatform:jest.fn()}}));
jest.mock("@capgo/native-purchases",()=>({NativePurchases:{configure:jest.fn(),isBillingSupported:jest.fn(),getProducts:jest.fn(),getUnfinishedTransactions:jest.fn(),purchaseProduct:jest.fn(),finishTransaction:jest.fn(),addListener:jest.fn()},PURCHASE_TYPE:{INAPP:"inapp"}}));
jest.mock("../api/axios",()=>({get:jest.fn(),post:jest.fn()}));
const transaction={transactionId:"123456",appAccountToken:"synthetic-intent",productIdentifier:"offers3",purchaseToken:"synthetic-google-token"};
const product={code:"offers_3",identifier:"offers3",price:19.95,currencyCode:"EUR",priceString:"19,95 €"};
let transactionNumber = 123456;
beforeEach(()=>{
  transaction.transactionId=String(++transactionNumber);
  jest.clearAllMocks();Capacitor.getPlatform.mockReturnValue("ios");Capacitor.isNativePlatform.mockReturnValue(true);
  NativePurchases.configure.mockResolvedValue();NativePurchases.getUnfinishedTransactions.mockResolvedValue({transactions:[]});
  NativePurchases.purchaseProduct.mockResolvedValue(transaction);NativePurchases.finishTransaction.mockResolvedValue();
  api.post.mockImplementation((url)=>Promise.resolve({data:url.includes("prepare")?{id:"synthetic-intent",product_id:"offers3"}:{status:"paid"}}));
});
test("purchase is account bound and not finished before server approval",async()=>{
  await storeBillingService.buy(product,"Test Person","store-v1");
  expect(NativePurchases.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({appAccountToken:"synthetic-intent",quantity:1,isConsumable:false,autoAcknowledgePurchases:false}));
  expect(api.post).toHaveBeenCalledWith("billing/store-verify/",{id:"synthetic-intent",reference:transaction.transactionId});
  expect(NativePurchases.finishTransaction).toHaveBeenCalledWith({transactionId:transaction.transactionId});
  expect(api.post.mock.invocationCallOrder.at(-1)).toBeLessThan(NativePurchases.finishTransaction.mock.invocationCallOrder[0]);
});
test("pending verification cannot finish or grant a purchase",async()=>{
  api.post.mockResolvedValue({data:{status:"pending",detail:"Pending"}});
  await expect(storeBillingService.verify(transaction)).rejects.toThrow("Pending");
  expect(NativePurchases.finishTransaction).not.toHaveBeenCalled();
});
test("verification failure never acknowledges store delivery",async()=>{
  api.post.mockRejectedValue({response:{status:409,data:{detail:"Invalid receipt"}}});
  await expect(storeBillingService.verify(transaction)).rejects.toBeDefined();
  expect(NativePurchases.finishTransaction).not.toHaveBeenCalled();
});
test("android token is verified by server and consumption is never premature on device",async()=>{
  Capacitor.getPlatform.mockReturnValue("android");
  await storeBillingService.verify(transaction);
  expect(api.post).toHaveBeenCalledWith("billing/store-verify/",{id:"synthetic-intent",reference:"synthetic-google-token"});
  expect(NativePurchases.finishTransaction).not.toHaveBeenCalled();
});
test("recovery ignores other account purchases and never finishes them",async()=>{
  NativePurchases.getUnfinishedTransactions.mockResolvedValue({transactions:[transaction]});
  api.post.mockRejectedValue({response:{status:404}});
  await storeBillingService.recover();
  expect(NativePurchases.finishTransaction).not.toHaveBeenCalled();
});
test("definitive cancellation releases pending checkout without claiming payment",async()=>{
  NativePurchases.purchaseProduct.mockRejectedValue({code:"USER_CANCELED"});
  await expect(storeBillingService.buy(product,"Test Person","store-v1")).rejects.toMatchObject({canceled:true});
  expect(api.post).toHaveBeenCalledWith("billing/store-cancel/",{id:"synthetic-intent"});
  expect(NativePurchases.finishTransaction).not.toHaveBeenCalled();
});
test("only authoritative, priced store products are offered",async()=>{
  NativePurchases.isBillingSupported.mockResolvedValue({isBillingSupported:true});
  NativePurchases.getProducts.mockResolvedValue({products:[product,{identifier:"missing-price"}]});
  const items=await storeBillingService.products({enabled:true,products:{offers_3:"offers3",pro:"missing-price",standard:"absent"}});
  expect(items).toHaveLength(1);expect(items[0].priceString).toBe("19,95 €");
});
test("iOS native cancellation message also releases the pending intent",async()=>{
  NativePurchases.purchaseProduct.mockRejectedValue(new Error("User cancelled"));
  await expect(storeBillingService.buy(product,"Test Person","store-v1")).rejects.toMatchObject({canceled:true});
  expect(api.post).toHaveBeenCalledWith("billing/store-cancel/",{id:"synthetic-intent"});
});
test("simultaneous StoreKit event and purchase result finish exactly once",async()=>{
  await Promise.all([storeBillingService.verify(transaction),storeBillingService.verify(transaction)]);
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(NativePurchases.finishTransaction).toHaveBeenCalledTimes(1);
});


test("verified revoked transactions are finished without reporting a successful purchase", async () => {
  api.post.mockRejectedValue({ response: { status: 409, data: { status: "refunded", detail: "Refunded" } } });
  await expect(storeBillingService.verify(transaction)).rejects.toMatchObject({ revoked: true });
  expect(NativePurchases.finishTransaction).toHaveBeenCalledWith({ transactionId: transaction.transactionId });
});
test("a revoked unfinished purchase does not permanently block recovering later purchases", async () => {
  NativePurchases.getUnfinishedTransactions.mockResolvedValue({ transactions: [transaction, { ...transaction, transactionId: "new-paid-transaction" }] });
  api.post.mockRejectedValueOnce({ response: { status: 409, data: { status: "refunded" } } }).mockResolvedValueOnce({ data: { status: "paid" } });
  await storeBillingService.recover();
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(NativePurchases.finishTransaction).toHaveBeenCalledWith({ transactionId: "new-paid-transaction" });
});
