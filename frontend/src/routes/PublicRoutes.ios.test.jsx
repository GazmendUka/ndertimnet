import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import PublicRoutes from "./PublicRoutes";
import api from "../api/axios";
import { useAuth } from "../auth/AuthContext";

jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("@capacitor/core", () => {
  const actual = jest.requireActual("@capacitor/core");
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: jest.fn(), getPlatform: jest.fn() } };
});
jest.mock("../api/axios", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../auth/AuthRedirect", () => () => <h1>Home destination</h1>);
function show(path) { return render(<MemoryRouter initialEntries={[path]}><Routes>{PublicRoutes()}</Routes></MemoryRouter>); }
beforeEach(() => {
  jest.clearAllMocks(); Capacitor.isNativePlatform.mockReturnValue(true); Capacitor.getPlatform.mockReturnValue("ios");
  useAuth.mockReturnValue({ user: null, loading: false, isCustomer: false, isCompany: false, access: null, login: jest.fn() });
  api.get.mockResolvedValue({ data: [] });
});

test.each(["/register/company", "/register/company/", "/register/%63ompany?source=link"])("iOS deep route %s cannot mount the company form", path => {
  show(path);
  expect(screen.getByRole("button", { name: "Hyni" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Emri i kompanisë")).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test("iOS generic registration still offers free customer registration", () => {
  show("/register");
  expect(screen.getByRole("heading", { name: "Krijo llogarinë tënde" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Kompani/ })).not.toBeInTheDocument();
});

test("iOS cannot open the public price page through a direct route", () => {
  show("/pricing?plan=pro");
  expect(screen.getByRole("heading", { name: "Home destination" })).toBeInTheDocument();
  expect(screen.queryByText("Çmimet për kompanitë")).not.toBeInTheDocument();
});

test.each(["web", "android"])("%s retains the business registration form", async platform => {
  Capacitor.isNativePlatform.mockReturnValue(platform !== "web"); Capacitor.getPlatform.mockReturnValue(platform);
  await act(async () => { show("/register/company"); });
  expect(screen.getByRole("heading", { name: "Krijo llogarinë e kompanisë" })).toBeInTheDocument();
  expect(screen.getByLabelText("Emri i kompanisë")).toBeInTheDocument();
});

test("the iOS About page offers company login instead of signup", () => {
  show("/about");
  expect(screen.getAllByRole("link", { name: /Kyçu si kompani/ }).length).toBeGreaterThan(0);
  expect(document.querySelector('a[href="/register/company"]')).not.toBeInTheDocument();
  expect(document.querySelector('a[href="/pricing"]')).not.toBeInTheDocument();
});
