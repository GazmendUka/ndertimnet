import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StagingAccountConfirmation from "./StagingAccountConfirmation";
import api from "../api/axios";
import { useAuth } from "./AuthContext";
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("./AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/axios", () => ({ post: jest.fn() }));
jest.mock("../utils/guestProject", () => ({ readGuestProject: () => null }));
beforeEach(() => { jest.clearAllMocks(); });
test("requires a sign-in and never offers to send mail or confirm someone else's account", () => {
  useAuth.mockReturnValue({ user: null });
  render(<StagingAccountConfirmation />);
  expect(screen.getByText(/Asnjë email verifikimi nuk dërgohet/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Shko te kyçja"}));
  expect(mockNavigate).toHaveBeenCalledWith("/login");expect(api.post).not.toHaveBeenCalled();
});
test("waits for server confirmation and account refresh before continuing", async () => {
  const refreshMe = jest.fn().mockResolvedValue({});useAuth.mockReturnValue({user:{role:"company"},refreshMe});
  let resolve;api.post.mockImplementation(() => new Promise(r => {resolve=r;}));
  render(<StagingAccountConfirmation />);
  fireEvent.click(screen.getByRole("button", {name:"Konfirmo llogarinë testuese"}));
  expect(screen.getByRole("button")).toBeDisabled();expect(mockNavigate).not.toHaveBeenCalled();
  resolve({data:{test_account:true}});
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/",{replace:true}));
  expect(refreshMe).toHaveBeenCalledTimes(1);expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("accounts/test/confirm-account/");
});
test("does not claim success or continue when the server rejects confirmation", async () => {
  const refreshMe=jest.fn();useAuth.mockReturnValue({user:{role:"company"},refreshMe});
  api.post.mockRejectedValue({response:{status:404}});
  render(<StagingAccountConfirmation />);fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Konfirmimi nuk u krye");
  expect(refreshMe).not.toHaveBeenCalled();expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByRole("button")).not.toBeDisabled();
});
