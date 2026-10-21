import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateMarketingCampaignPage from "./CreateMarketingCampaignPage";
import MarketingDashboardPage from "./MarketingDashboardPage";
import api from "../../api/axios";

jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../../api/axios", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../../auth/AuthContext", () => ({ useAuth: () => ({ user: { company_name: "Test Company" } }) }));

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => "blob:test-image");
  URL.revokeObjectURL = jest.fn();
});

function showForm() {
  const view = render(<MemoryRouter><CreateMarketingCampaignPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Titulli"), { target: { value: "Fushatë për provë" } });
  fireEvent.change(screen.getByLabelText("Përshkrim i shkurtër"), { target: { value: "Përshkrim i gjatë për fushatën e provës." } });
  fireEvent.change(screen.getByLabelText("Lidhja"), { target: { value: "https://example.com/campaign" } });
  fireEvent.change(view.container.querySelector('input[type="file"]'), { target: { files: [new File(["test"], "image.png", { type: "image/png" })] } });
  return view;
}

test("submits a real multipart request and only acknowledges successful storage", async () => {
  api.post.mockResolvedValueOnce({ data: { id: 8, status: "pending" } });
  showForm();
  fireEvent.click(screen.getByRole("button", { name: "Dërgo për miratim" }));
  expect(await screen.findByRole("heading", { name: "Fushata është dërguar" })).toBeInTheDocument();
  const [url, payload] = api.post.mock.calls[0];
  expect(url).toBe("marketing/campaigns/");
  expect(payload).toBeInstanceOf(FormData);
  expect(payload.get("title")).toBe("Fushatë për provë");
  expect(payload.get("image")).toBeInstanceOf(File);
  expect(payload.has("review_status")).toBe(false);
  fireEvent.click(screen.getByRole("link", { name: "Krijo një fushatë të re" }));
  expect(screen.getByLabelText("Titulli")).toHaveValue("");
});

test("storage failure preserves the form and file for a real retry", async () => {
  api.post.mockRejectedValueOnce({ response: { data: { image: ["Imazh shumë i vogël."] } } });
  api.post.mockResolvedValueOnce({ data: { id: 9 } });
  showForm();
  fireEvent.click(screen.getByRole("button", { name: "Dërgo për miratim" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Kontrolloni fushat");
  expect(screen.getByText("Imazh shumë i vogël.")).toBeInTheDocument();
  expect(screen.queryByText("Fushata është dërguar")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Titulli")).toHaveValue("Fushatë për provë");
  fireEvent.click(screen.getByRole("button", { name: "Dërgo për miratim" }));
  await screen.findByText("Fushata është dërguar");
  expect(api.post.mock.calls[0][1].get("image")).toBe(api.post.mock.calls[1][1].get("image"));
});

test("unsafe URL is blocked before upload", () => {
  const view = showForm();
  fireEvent.change(screen.getByLabelText("Lidhja"), { target: { value: "javascript:alert(1)" } });
  fireEvent.submit(view.container.querySelector("form"));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByText(/Shkruani një adresë URL të vlefshme/)).toBeInTheDocument();
});

const campaign = { id: 4, title: "Fushatë reale", description: "Përshkrim i provës", status: "pending", duration_days: 7 };

test("dashboard uses owned server data, supports pages and withdraws only after confirmation", async () => {
  api.get.mockResolvedValue({ data: { count: 13, results: [campaign], next: "?page=2", previous: null } });
  api.post.mockResolvedValue({ data: {} });
  render(<MemoryRouter><MarketingDashboardPage /></MemoryRouter>);
  await screen.findByText("Fushatë reale");
  expect(screen.getByText("Në pritje të miratimit")).toBeInTheDocument();
  expect(screen.queryByText("Vegla për profesionistë")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tjetra" }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith("marketing/campaigns/", expect.objectContaining({ params: { page: 2 } })));
  await screen.findByText("Fushatë reale");
  fireEvent.click(screen.getByRole("button", { name: "Tërhiq fushatën" }));
  expect(api.post).not.toHaveBeenCalled();
  api.get.mockResolvedValue({ data: { count: 1, results: [{ ...campaign, status: "withdrawn" }], next: null, previous: null } });
  fireEvent.click(screen.getByRole("button", { name: "Po, tërhiqe" }));
  expect(await screen.findByText("E tërhequr")).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith("marketing/campaigns/4/withdraw/");
});

test("empty state and network failure never show example campaigns", async () => {
  api.get.mockRejectedValueOnce(new Error("offline"));
  api.get.mockResolvedValueOnce({ data: { count: 0, results: [], next: null, previous: null } });
  render(<MemoryRouter><MarketingDashboardPage /></MemoryRouter>);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Provo përsëri" }));
  await screen.findByText(/Nuk keni ende fushata/);
});
