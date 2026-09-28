import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomerDashboard from "./CustomerDashboard";
import JobStatusBadge from "../../components/ui/JobStatusBadge";
import api from "../../api/axios";
import { useAuth } from "../../auth/AuthContext";

jest.mock("../../api/axios", () => ({ get: jest.fn() }));
jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
beforeEach(() => {
  jest.resetAllMocks();
  useAuth.mockReturnValue({ user: { first_name: "Test" }, access: "test", isCustomer: true });
});
const payload = { data: { stats: { total: 23, active: 12, in_progress: 2, completed: 3, unpublished: 4, closed: 2 }, latest_jobs: [{ id: 1, title: "Latest job", is_active: false, status: "in_progress", moderation_status: "approved" }] } };
const show = () => render(<MemoryRouter><CustomerDashboard /></MemoryRouter>);

test("uses whole-account summary, not number of latest jobs", async () => {
  api.get.mockResolvedValue(payload);
  show();
  await screen.findByText("Latest job");
  expect(screen.getByText("Kërkesat gjithsej").parentElement).toHaveTextContent("23");
  expect(screen.getByText("Kërkesa aktive").parentElement).toHaveTextContent("12");
  expect(screen.getByText("Kërkesa të papublikuara").parentElement).toHaveTextContent("4");
  expect(screen.getByText("Në proces")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("jobrequests/summary/");
});

test("failure does not claim customer has no jobs, retry restores counts", async () => {
  api.get.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(payload);
  show();
  await screen.findByRole("alert");
  expect(screen.queryByText(/Ende nuk keni/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Provo përsëri" }));
  await screen.findByText("Latest job");
});

test.each([
  [{ status: "in_progress", is_active: false }, "Në proces"],
  [{ status: "completed", is_completed: true }, "E përfunduar"],
  [{ status: "cancelled" }, "E anuluar"],
  [{ moderation_status: "pending", is_active: false }, "Në shqyrtim"],
  [{ moderation_status: "approved", is_active: false }, "E mbyllur"],
])("lifecycle badge reflects %j", (job, label) => {
  render(<JobStatusBadge job={job} />);
  expect(screen.getByText(label)).toBeInTheDocument();
});
