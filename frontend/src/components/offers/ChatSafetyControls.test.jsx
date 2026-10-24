import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ChatSafetyControls from "./ChatSafetyControls";
import api from "../../api/axios";
jest.mock("../../api/axios", () => ({ get: jest.fn(), post: jest.fn() }));
const initial = { blocked: false, blocked_by_me: false, can_report: true };
beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: initial });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
function setup(props = {}) {
  const onStateChange = jest.fn();
  render(<ChatSafetyControls offerId={12} onStateChange={onStateChange} onReportClose={jest.fn()} {...props} />);
  return onStateChange;
}
test("a failed block never changes the confirmed state and can be retried", async () => {
  const changed = setup();
  const block = await screen.findByRole("button", { name: "Blloko" });
  await waitFor(() => expect(block).toBeEnabled());
  fireEvent.click(block);
  api.post.mockRejectedValueOnce(new Error("Offline"));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Blloko" }));
  await screen.findByRole("alert");
  expect(changed).not.toHaveBeenCalledWith(expect.objectContaining({ blocked: true }));
  api.post.mockResolvedValueOnce({ data: { ...initial, blocked: true, blocked_by_me: true } });
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Blloko" }));
  await screen.findByRole("button", { name: "Zhblloko" });
  expect(api.post).toHaveBeenLastCalledWith("offers/12/chat-block/", { blocked: true });
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({ blocked: true }));
});
test("reporting a message sends its id and optional blocking in one request", async () => {
  api.post.mockResolvedValue({ data: { chat_state: { ...initial, blocked: true, blocked_by_me: true }, already_reported: false } });
  const changed = setup({ messageToReport: { id: 57, message: "Demo message" } });
  // Initial load completes before selecting a message, as in the real chat.
  await waitFor(() => expect(changed).toHaveBeenCalledWith(initial));
  fireEvent.click(await screen.findByRole("button", { name: "Raporto" }));
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Dërgo raportin" }));
  await screen.findByText(/Raporti u dërgua/);
  expect(api.post).toHaveBeenCalledWith("offers/12/chat-reports/", { reason: "harassment", details: "", block_user: true, message_id: 57 });
});
test("other reason requires details and cancel sends nothing", async () => {
  setup();
  const report = await screen.findByRole("button", { name: "Raporto" });
  await waitFor(() => expect(report).toBeEnabled());
  fireEvent.click(report);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "other" } });
  expect(screen.getByRole("button", { name: "Dërgo raportin" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "A longer explanation" } });
  expect(screen.getByRole("button", { name: "Dërgo raportin" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Anulo" }));
  expect(api.post).not.toHaveBeenCalled();
});
test("unblocking keeps the server state when the other participant also blocked", async () => {
  api.get.mockResolvedValue({ data: { ...initial, blocked: true, blocked_by_me: true } });
  const changed = setup();
  fireEvent.click(await screen.findByRole("button", { name: "Zhblloko" }));
  api.post.mockResolvedValue({ data: { ...initial, blocked: true, blocked_by_me: false } });
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Zhblloko" }));
  await screen.findByText("Bllokimi juaj u hoq.");
  expect(changed).toHaveBeenLastCalledWith({ ...initial, blocked: true, blocked_by_me: false });
});
