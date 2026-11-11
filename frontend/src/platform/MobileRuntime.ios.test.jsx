import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import MobileRuntime from "./MobileRuntime";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

jest.mock("react-router-dom", () => { global.TextEncoder = require("util").TextEncoder; return jest.requireActual("react-router"); });
jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" } }));
jest.mock("@capacitor/app", () => ({ App: { addListener: jest.fn() } }));
jest.mock("@capacitor/browser", () => ({ Browser: { close: jest.fn(async () => {}), open: jest.fn() } }));
jest.mock("@capacitor/network", () => ({ Network: { getStatus: async () => ({ connected: true }), addListener: async () => ({ remove: jest.fn() }) } }));
jest.mock("@capacitor/splash-screen", () => ({ SplashScreen: { hide: jest.fn(async () => {}) } }));
jest.mock("@capacitor/status-bar", () => ({ StatusBar: { setStyle: async () => {}, setBackgroundColor: async () => {} }, Style: { Dark: "DARK" } }));
let listeners;
function Location() { const l = useLocation(); return <p data-testid="location">{l.pathname}{l.search}</p>; }
beforeEach(() => { jest.clearAllMocks(); require("@capacitor/splash-screen").SplashScreen.hide.mockResolvedValue(); Browser.close.mockResolvedValue(); listeners = {}; App.addListener.mockImplementation(async (name, callback) => { listeners[name] = callback; return { remove: jest.fn() }; }); });
async function show() {
  render(<MemoryRouter><MobileRuntime /><Location /><a href="https://ndertimnet.com/register/company" target="_blank" rel="noreferrer">Company link</a><a href="https://ndertimnet.com/privacy.html" target="_blank" rel="noreferrer">Privacy</a></MemoryRouter>);
  await waitFor(() => expect(listeners.appUrlOpen).toBeDefined());
}

test("iOS app links cannot open company registration, while offer links still work", async () => {
  await show();
  await act(async () => listeners.appUrlOpen({ url: "ndertimnet://register/company?from=link" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/login");
  await act(async () => listeners.appUrlOpen({ url: "https://ndertimnet.com/company/offers/7?from=push" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/company/offers/7?from=push");
});

test("iOS intercepts external first-party signup links while required policy links remain usable", async () => {
  await show();
  fireEvent.click(screen.getByRole("link", { name: "Company link" }));
  expect(Browser.open).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "Privacy" }));
  expect(Browser.open).toHaveBeenCalledWith(expect.objectContaining({ url: "https://ndertimnet.com/privacy.html" }));
});

test("returning to the iOS app requests an account-balance refresh", async () => {
  const refresh = jest.fn(); window.addEventListener("ndertimnet:account-refresh", refresh);
  try { await show(); await waitFor(() => expect(listeners.appStateChange).toBeDefined()); listeners.appStateChange({ isActive: true }); expect(refresh).toHaveBeenCalledTimes(1); }
  finally { window.removeEventListener("ndertimnet:account-refresh", refresh); }
});
