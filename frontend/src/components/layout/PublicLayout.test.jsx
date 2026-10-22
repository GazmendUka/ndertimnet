import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import PublicLayout from "./PublicLayout";
import { useAuth } from "../../auth/AuthContext";
import api from "../../api/axios";

jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("@capacitor/core", () => {
  const actual = jest.requireActual("@capacitor/core");
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } };
});
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../api/axios", () => ({ get: jest.fn() }));

beforeEach(() => {
  useAuth.mockReturnValue({ isCustomer: false, isCompany: false, access: null });
  api.get.mockResolvedValue({ data: [] });
});

function showLayout() {
  return render(<MemoryRouter initialEntries={["/about"]}><Routes>
    <Route element={<PublicLayout />}><Route path="/about" element={<p>Public page</p>} /></Route>
    <Route path="/login" element={<h1>Login destination</h1>} />
  </Routes></MemoryRouter>);
}

test("a guest can open login directly from the middle navigation item", () => {
  showLayout();
  const nav = screen.getByRole("navigation", { name: "Navigimi kryesor" });
  const links = within(nav).getAllByRole("link");
  expect(links[2]).toHaveAccessibleName("Kyçu");
  expect(within(nav).queryByRole("link", { name: "Publiko" })).not.toBeInTheDocument();
  userEvent.click(links[2]);
  expect(screen.getByRole("heading", { name: "Login destination" })).toBeInTheDocument();
});

test.each([
  ["customer", { isCustomer: true, isCompany: false }, ["Ballina", "Kërkesat", "Publiko", "Profili"]],
  ["company", { isCustomer: false, isCompany: true }, ["Ballina", "Punë", "Ofertat", "Marketingu"]],
])("a signed-in %s keeps the existing account menu on public pages", async (_, role, labels) => {
  useAuth.mockReturnValue({ ...role, access: "local-test", logout: jest.fn() });
  showLayout();
  const nav = screen.getByRole("navigation", { name: "Navigimi kryesor" });
  expect(within(nav).getAllByRole("link").map(link => link.textContent)).toEqual(labels);
  expect(within(nav).queryByRole("link", { name: "Kyçu" })).not.toBeInTheDocument();
  expect(within(nav).getByRole("button", { name: "Më shumë" })).toBeInTheDocument();
  // Let the existing menu's asynchronous unread/lead lookups complete.
  await screen.findByText("Public page");
});
