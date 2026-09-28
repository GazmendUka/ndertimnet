import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContactPage from "./ContactPage";
import api from "../api/axios";

jest.mock("../api/axios", () => ({ post: jest.fn() }));
jest.mock("react-helmet", () => ({
  // Include structured metadata so address-leak checks cover it as well as visible text.
  Helmet: ({ children }) => require("react").Children.toArray(children).filter(child => child.type === "script"),
}));

beforeEach(() => jest.clearAllMocks());

function fillForm() {
  fireEvent.change(screen.getByLabelText("Emri juaj"), { target: { value: "Test Person" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "visitor@example.com" } });
  fireEvent.change(screen.getByLabelText("Mesazhi juaj"), { target: { value: "Please help with my project." } });
}

function expectNoSupportAddress() {
  expect(document.body.innerHTML).not.toMatch(/group-globale\.com|mailto:/i);
  const metadata = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  expect(metadata.contactPoint).not.toHaveProperty("email");
}

test("contact page and metadata do not expose the support address", () => {
  render(<ContactPage />);
  expectNoSupportAddress();
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
});

test("empty form does not call the server", () => {
  render(<ContactPage />);
  fireEvent.click(screen.getByRole("button", { name: /Dërgo mesazhin/ }));
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getAllByRole("alert")).toHaveLength(3);
});

test("waits for explicit server acceptance and prevents repeated submission", async () => {
  let accept;
  api.post.mockImplementation(() => new Promise(resolve => { accept = resolve; }));
  render(<ContactPage />);
  fillForm();
  const form = screen.getByRole("button", { name: /Dërgo mesazhin/ }).closest("form");
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("contact/", {
    name: "Test Person", email: "visitor@example.com", message: "Please help with my project.",
  }, { skipAuth: true, skipErrorLog: true, timeout: 20000 });
  expect(screen.getByRole("button", { name: /Duke dërguar/ })).toBeDisabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await act(async () => accept({ data: { accepted: true } }));
  expect(screen.getByRole("status")).toHaveTextContent("Mesazhi u dërgua me sukses");
});

test.each([503, 429, undefined])("failure %s retains the message and permits retry", async status => {
  api.post.mockRejectedValueOnce({ response: status ? { status } : undefined });
  render(<ContactPage />);
  fillForm();
  fireEvent.click(screen.getByRole("button", { name: /Dërgo mesazhin/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(status === 429 ? "shumë kërkesa" : "nuk mund të konfirmohej");
  expectNoSupportAddress();
  expect(screen.getByLabelText("Mesazhi juaj")).toHaveValue("Please help with my project.");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  api.post.mockResolvedValueOnce({ data: { accepted: true } });
  fireEvent.click(screen.getByRole("button", { name: /Dërgo mesazhin/ }));
  await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
});

test("an unexpected HTML or empty response is not treated as success", async () => {
  api.post.mockResolvedValue({ data: "<html>Not the API</html>" });
  render(<ContactPage />);
  fillForm();
  fireEvent.click(screen.getByRole("button", { name: /Dërgo mesazhin/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("nuk mund të konfirmohej");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("server validation points to the relevant field", async () => {
  api.post.mockRejectedValue({ response: { status: 400, data: { email: ["Invalid"] } } });
  render(<ContactPage />);
  fillForm();
  fireEvent.click(screen.getByRole("button", { name: /Dërgo mesazhin/ }));
  expect(await screen.findByText("Kontrolloni adresën e emailit.")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
});
