import React from "react";
import { render, screen, within } from "@testing-library/react";
import SiteFooter from "./SiteFooter";

jest.mock("react-router-dom", () => ({ Link: ({ to, ...props }) => <a href={to} {...props} /> }));
jest.mock("../../platform/mobile", () => ({ isNativeApp: () => false, openExternalUrl: jest.fn() }));

test("keeps all city, service and legal destinations discoverable", () => {
  render(<SiteFooter />);
  expect(within(screen.getByRole("navigation", { name: "Qytetet" })).getAllByRole("link")).toHaveLength(6);
  expect(within(screen.getByRole("navigation", { name: "Shërbimet" })).getAllByRole("link")).toHaveLength(10);
  expect(within(screen.getByRole("navigation", { name: "Privatësia dhe llogaria" })).getAllByRole("link")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Ndertimnet — Ballina" }).getAttribute("href")).toBe("/");
  expect(screen.getByRole("link", { name: "Fshirja e llogarisë" }).getAttribute("href")).toBe("/account-deletion.html");
  expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Ndertimnet`))).toBeTruthy();
});

test("reserves bottom navigation and safe-area space only in the native app", () => {
  const { rerender } = render(<SiteFooter />);
  expect(screen.getByRole("contentinfo").className).toBe("site-footer");
  rerender(<SiteFooter isNativeApp />);
  expect(screen.getByRole("contentinfo").className).toContain("site-footer--native");
});
