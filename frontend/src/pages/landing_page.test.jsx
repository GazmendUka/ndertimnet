import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./landing_page";
import api from "../api/axios";
import { Capacitor } from "@capacitor/core";
jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../api/axios", () => ({ get: jest.fn() }));
jest.mock("../components/payments/PlatformBilling", () => ({ PublicSubscriptionPricing: () => null }));
jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: jest.fn() } }));

beforeEach(() => Capacitor.isNativePlatform.mockReturnValue(true));

test("approved campaign keeps its own image area and the welcome heading and project access", async () => {
  api.get.mockResolvedValue({ data: { id: 8, title: "Hero test campaign", subtitle: "Campaign details", link_type: "external", target_url: "https://example.com/campaign", background_image_url: "/test-image.png", cta_text: "Zbulo ofertën", company_name: "Test Company" } });
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(await screen.findByRole("heading", { level: 2, name: "Hero test campaign" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Gjeni profesionistin e duhur." })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByText("Reklamë")).toBeInTheDocument();
  expect(screen.getByText("Partneri: Test Company")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Zbulo ofertën" })).toHaveAttribute("href", "https://example.com/campaign");
  expect(screen.getAllByRole("link", { name: /Fillo projektin/ }).length).toBeGreaterThan(0);
});

test("empty Hero response shows a compact welcome without a placeholder campaign or image", async () => {
  api.get.mockResolvedValue({ data: null });
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(await screen.findByRole("heading", { level: 1, name: "Gjeni profesionistin e duhur." })).toBeInTheDocument();
  expect(screen.queryByText("Reklamë")).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Përmbajtje e sponsorizuar" })).not.toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "A jeni kompani?" })).toBeInTheDocument();
});

test("the campaign example opens on request, is labelled illustrative and closes without navigation", async () => {
  // jsdom has no native dialog implementation; real keyboard behavior is checked in Chromium.
  const prototype = HTMLDialogElement.prototype;
  const originalShow = prototype.showModal;
  const originalClose = prototype.close;
  prototype.showModal = function () { this.setAttribute("open", ""); };
  prototype.close = function () { this.removeAttribute("open"); };
  try {
    api.get.mockResolvedValue({ data: null });
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const trigger = screen.getByRole("button", { name: "A jeni kompani?" });
    userEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Kështu mund të duket fushata juaj" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/vetëm një shembull ilustrues/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Regjistro kompaninë", exact: true })).toHaveAttribute("href", "/register/company");
    userEvent.click(screen.getByRole("button", { name: "Mbyll shembullin" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  } finally {
    if (originalShow) prototype.showModal = originalShow;
    else delete prototype.showModal;
    if (originalClose) prototype.close = originalClose;
    else delete prototype.close;
  }
});

test("advertisement API failure leaves the normal Hero usable", async () => {
  const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
  api.get.mockRejectedValue(new Error("offline"));
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(await screen.findByRole("heading", { level: 1, name: "Gjeni profesionistin e duhur." })).toBeInTheDocument();
  warning.mockRestore();
});

test("the website keeps its original text, background image and project button", async () => {
  Capacitor.isNativePlatform.mockReturnValue(false);
  api.get.mockResolvedValue({ data: null });
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(await screen.findByRole("heading", { level: 1, name: "Gjeni kompaninë për projektin tuaj." })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Kantier ndërtimi dhe renovimi" })).toBeInTheDocument();
  expect(screen.getByText("Nga ideja te Shtëpia juaj")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "A jeni kompani?" })).not.toBeInTheDocument();
});

test("website campaigns retain their original Hero layout without the native welcome", async () => {
  Capacitor.isNativePlatform.mockReturnValue(false);
  api.get.mockResolvedValue({ data: { title: "Website campaign", link_type: "external", target_url: "https://example.com/", background_image_url: "/test.png" } });
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(await screen.findByRole("heading", { level: 1, name: "Website campaign" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Gjeni profesionistin e duhur." })).not.toBeInTheDocument();
});
