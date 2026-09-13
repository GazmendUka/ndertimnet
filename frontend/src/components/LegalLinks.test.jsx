import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LegalLinks, { LegalLink } from "./LegalLinks";
import { isNativeApp, openExternalUrl } from "../platform/mobile";
import toast from "react-hot-toast";

jest.mock("../platform/mobile", () => ({ isNativeApp: jest.fn(), openExternalUrl: jest.fn() }));
jest.mock("react-hot-toast", () => ({ error: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test("public links point to actual HTML pages without requiring a router or login", () => {
  isNativeApp.mockReturnValue(false);
  render(<LegalLinks />);
  expect(screen.getByRole("link", { name: "Politika e privatësisë" }).getAttribute("href")).toBe("/privacy.html");
  expect(screen.getByRole("link", { name: "Fshirja e llogarisë" }).getAttribute("href")).toBe("/account-deletion.html");
});

test("footer uses a named navigation group without menu-button styling", () => {
  isNativeApp.mockReturnValue(false);
  render(<LegalLinks variant="footer" />);
  expect(screen.getByRole("navigation", { name: "Privatësia dhe llogaria" }).className).toBe("legal-links--footer");
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Politika e privatësisë" }).className).toBe("");
});

test("native app opens the current policy without leaving its WebView", async () => {
  isNativeApp.mockReturnValue(true);
  openExternalUrl.mockResolvedValue(undefined);
  const onClick = jest.fn();
  render(<LegalLink onClick={onClick} />);
  fireEvent.click(screen.getByRole("link"));
  await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  expect(openExternalUrl).toHaveBeenCalledWith("https://ndertimnet.com/privacy.html");
});

test("native account deletion opens the public instructions", async () => {
  isNativeApp.mockReturnValue(true);
  openExternalUrl.mockResolvedValue(undefined);
  render(<LegalLink deletion />);
  fireEvent.click(screen.getByRole("link"));
  await waitFor(() => expect(openExternalUrl).toHaveBeenCalledWith("https://ndertimnet.com/account-deletion.html"));
});

test("a browser failure shows an error and keeps the menu open for retry", async () => {
  isNativeApp.mockReturnValue(true);
  openExternalUrl.mockRejectedValue(new Error("unavailable"));
  const onClick = jest.fn();
  render(<LegalLink onClick={onClick} />);
  fireEvent.click(screen.getByRole("link"));
  await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
  expect(onClick).not.toHaveBeenCalled();
});
