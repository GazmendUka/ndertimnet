import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CompanyJobDetails from "./CompanyJobDetails";
import api from "../../api/axios";
import paymentService from "../../services/paymentService";
import { useAuth } from "../../auth/AuthContext";

jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../../api/axios", () => ({ get: jest.fn() }));
jest.mock("../../services/paymentService", () => ({ unlockLead: jest.fn() }));
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../platform/mobile", () => ({ openPaymentUrl: jest.fn() }));
jest.mock("react-hot-toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const job = {
  id: 22, title: "Projekt prove", description: "Paragrafi i parë.\n\nParagrafi i dytë me detaje.",
  is_active: true, lead_unlocked: false, created_at: "2026-09-01T12:00:00Z",
  city_detail: { name: "Qytet prove" }, budget: "2500.00",
  profession_detail: { name: "Renovim", industry_detail: { name: "Ndërtim" } },
  customer: { user: { first_name: "Test", last_name: "Customer", email: "customer@example.com" }, phone: "00000000", address: "Test address" },
  audit_logs: [{ id: 1, action: "Private history", created_at: "2026-09-01T12:00:00Z" }],
};
function show(data = job, exists = false) {
  api.get.mockImplementation(url => Promise.resolve({ data: url.startsWith("jobrequests/") ? data : { exists, offer_id: exists ? 7 : null } }));
  return render(<MemoryRouter initialEntries={["/company/jobrequests/22"]}><Routes>
    <Route path="/company/jobrequests/:jobId" element={<CompanyJobDetails />} />
    <Route path="/company/jobrequests/:jobId/offer/edit" element={<p>Offer editor</p>} />
  </Routes></MemoryRouter>);
}
beforeEach(() => {
  jest.resetAllMocks();
  useAuth.mockReturnValue({ user: { id: 1 }, isCompany: true, access: "test" });
});

test("job description occupies the main section and keeps paragraphs and metadata", async () => {
  show();
  const info = await screen.findByRole("region", { name: "Informacioni i kërkesës" });
  const description = info.querySelector("p");
  expect(description.textContent.trim()).toBe(job.description);
  expect(description).toHaveClass("whitespace-pre-wrap");
  expect(info).toHaveClass("lg:col-span-2", "lg:col-start-2");
  expect(within(info).getByText("2500.00 €")).toBeInTheDocument();
  expect(within(info).getByText("Ndërtim / Renovim")).toBeInTheDocument();
  const customer = screen.getByRole("region", { name: "Informacioni i klientit" });
  expect(customer.closest("aside")).toHaveClass("lg:col-start-1");
  const offer = screen.getByRole("region", { name: "Menaxhimi i ofertës" });
  expect(info.compareDocumentPosition(customer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(customer.compareDocumentPosition(offer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(offer).toHaveClass("lg:row-start-2");
});

test("locked client details and history are not inserted into the page", async () => {
  show();
  await screen.findByText("Lead është i mbyllur");
  for (const value of ["customer@example.com", "Test Customer", "00000000", "Test address", "Private history"]) {
    expect(document.body.textContent).not.toContain(value);
  }
  expect(paymentService.unlockLead).not.toHaveBeenCalled();
});

test("unlocked customer remains in sidebar and history remains available", async () => {
  show({ ...job, lead_unlocked: true });
  const customer = await screen.findByRole("region", { name: "Informacioni i klientit" });
  expect(within(customer).getByText(/customer@example.com/)).toBeInTheDocument();
  expect(screen.getByText("Private history")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Krijo ofertë" }));
  expect(await screen.findByText("Offer editor")).toBeInTheDocument();
});

test("prepare-offer action retains the existing API and navigation flow", async () => {
  paymentService.unlockLead.mockResolvedValue({ data: { lead_unlocked: false } });
  show();
  fireEvent.click(await screen.findByRole("button", { name: "Përgatit ofertën" }));
  expect(await screen.findByText("Offer editor")).toBeInTheDocument();
  expect(paymentService.unlockLead).toHaveBeenCalledTimes(1);
  expect(paymentService.unlockLead).toHaveBeenCalledWith("22");
});

test("existing offer action remains available", async () => {
  show({ ...job, lead_unlocked: true }, true);
  fireEvent.click(await screen.findByRole("button", { name: "Krijo ofertën" }));
  expect(await screen.findByText("Offer editor")).toBeInTheDocument();
});

test("closed job and missing description still render", async () => {
  show({ ...job, is_active: false, lead_unlocked: true, description: "" });
  expect(await screen.findByText("Nuk ka përshkrim.")).toBeInTheDocument();
  expect(screen.getByText(/Kjo kërkesë është mbyllur/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Krijo ofert/ })).not.toBeInTheDocument();
});
