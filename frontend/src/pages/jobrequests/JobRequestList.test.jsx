import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JobRequestList from "./JobRequestList";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

jest.mock("../../api/axios", () => ({ get: jest.fn() }));
// CRA's Jest resolver predates the react-router/dom package export.
// Use the real core router exports, not mocked navigation behavior.
jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../components/payments/OfferIntroduction", () => () => null);

const customer = { user: { id: 1 }, access: "test", isCustomer: true, isCompany: false };
const result = (title, extra = {}) => ({ data: { results: [{ id: title, title, moderation_status: "approved", is_active: true }], count: 23, next: "next", previous: null, ...extra } });
function show(path = "/customer/jobrequests") {
  return render(<MemoryRouter initialEntries={[path]}><JobRequestList /></MemoryRouter>);
}
beforeEach(() => { jest.resetAllMocks(); useAuth.mockReturnValue(customer); });

test("navigates beyond first page and back without following absolute API URLs", async () => {
  api.get.mockResolvedValueOnce(result("First project"))
    .mockResolvedValueOnce(result("Second page project", { previous: "previous" }))
    .mockResolvedValueOnce(result("Last project", { previous: "previous", next: null }))
    .mockResolvedValueOnce(result("Second page project", { previous: "previous" }));
  show();
  await screen.findByText("First project");
  expect(screen.getByRole("button", { name: "E mëparshme" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Tjetra" }));
  await screen.findByText("Second page project");
  expect(api.get).toHaveBeenLastCalledWith("jobrequests/?mine=1&page=2");
  fireEvent.click(screen.getByRole("button", { name: "Tjetra" }));
  await screen.findByText("Last project");
  expect(screen.getByRole("status")).toHaveTextContent("Faqja 3 nga 3 · 23 kërkesa");
  expect(screen.getByRole("button", { name: "Tjetra" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "E mëparshme" }));
  await screen.findByText("Second page project");
});

test("keeps current page in the URL for return from details", async () => {
  api.get.mockResolvedValue(result("Saved page", { previous: "previous" }));
  show("/customer/jobrequests?page=2");
  await screen.findByText("Saved page");
  expect(api.get).toHaveBeenCalledWith("jobrequests/?mine=1&page=2");
});

test("failure is not shown as an empty list and supports retry", async () => {
  api.get.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(result("Recovered"));
  show();
  await screen.findByRole("alert");
  expect(screen.queryByText(/Ende nuk keni/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Provo përsëri" }));
  await screen.findByText("Recovered");
});

test("removed last page offers recovery to page one", async () => {
  api.get.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce(result("First"));
  show("/customer/jobrequests?page=9");
  fireEvent.click(await screen.findByRole("button", { name: "Kthehu te faqja e parë" }));
  await screen.findByText("First");
  expect(api.get).toHaveBeenLastCalledWith("jobrequests/?mine=1&page=1");
});

test("empty response shows an explicit empty state", async () => {
  api.get.mockResolvedValue({ data: { results: [], count: 0, next: null, previous: null } });
  show();
  await screen.findByText(/Ende nuk keni/);
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
});

test("company list waits for access check and uses server-side offer filtering", async () => {
  useAuth.mockReturnValue({ ...customer, isCustomer: false, isCompany: true });
  let resolveProfile;
  api.get.mockImplementation(url => url.includes("profile/company")
    ? new Promise(resolve => { resolveProfile = resolve; })
    : Promise.resolve(url.startsWith("jobrequests/") ? result("Available project") : {data:[]}));
  show();
  expect(api.get.mock.calls.filter(([url]) => url.startsWith("jobrequests/"))).toHaveLength(0);
  await act(async () => resolveProfile({ data: { can_access_marketplace: true } }));
  await screen.findByText("Available project");
  expect(api.get).toHaveBeenLastCalledWith("jobrequests/?without_my_offer=1&page=1");
});

test("locked company does not fetch job data", async () => {
  useAuth.mockReturnValue({ ...customer, isCustomer: false, isCompany: true });
  api.get.mockResolvedValue({ data: { can_access_marketplace: false } });
  show();
  await screen.findAllByText("Këtu do të shfaqen kërkesat reale");
  expect(api.get.mock.calls.filter(([url]) => url.startsWith("jobrequests/"))).toHaveLength(0);
});

test("changing city resets page while recommendations are sent to the server", async () => {
  useAuth.mockReturnValue({ ...customer, isCustomer: false, isCompany: true });
  api.get.mockImplementation(url => Promise.resolve(url.includes("profile/company")
    ? {data:{can_access_marketplace:true}}
    : url.includes("locations/cities") ? {data:[{id:7,name:"Test city"}]}
    : url.includes("taxonomy") ? {data:[]}
    : result("Matched project")));
  show("/company/jobrequests?page=3");
  await screen.findByText("Matched project");
  fireEvent.change(screen.getByLabelText("Qyteti"), {target:{value:"7"}});
  await act(async () => {});
  expect(api.get).toHaveBeenCalledWith("jobrequests/?without_my_offer=1&page=1&city=7");
});
