import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./landing_page";
import api from "../api/axios";
jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../api/axios", () => ({ get: jest.fn() }));
jest.mock("../components/payments/PlatformBilling", () => ({ PublicSubscriptionPricing: () => null }));

test("approved campaign occupies Hero with sponsor label, CTA and project access", async () => {
  api.get.mockResolvedValue({ data: { id: 8, title: "Hero test campaign", subtitle: "Campaign details", link_type: "external", target_url: "https://example.com/campaign", background_image_url: "/test-image.png", cta_text: "Zbulo ofertën", company_name: "Test Company" } });
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(await screen.findByRole("heading", { level: 1, name: "Hero test campaign" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { level: 1, name: "Gjeni kompaninë për projektin tuaj." })).not.toBeInTheDocument();
  expect(screen.getByText("Reklamë")).toBeInTheDocument();
  expect(screen.getByText("Partneri: Test Company")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Zbulo ofertën" })).toHaveAttribute("href", "https://example.com/campaign");
  expect(screen.getAllByRole("link", { name: /Fillo projektin/ }).length).toBeGreaterThan(0);
});

test("empty Hero response preserves the normal main Hero", async () => {
  api.get.mockResolvedValue({ data: null });
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(await screen.findByRole("heading", { level: 1, name: "Gjeni kompaninë për projektin tuaj." })).toBeInTheDocument();
  expect(screen.queryByText("Reklamë")).not.toBeInTheDocument();
});

test("advertisement API failure leaves the normal Hero usable", async () => {
  const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
  api.get.mockRejectedValue(new Error("offline"));
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(await screen.findByRole("heading", { level: 1, name: "Gjeni kompaninë për projektin tuaj." })).toBeInTheDocument();
  warning.mockRestore();
});
