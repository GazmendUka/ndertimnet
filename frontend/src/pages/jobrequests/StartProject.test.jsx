import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StartProject from "./StartProject";
import { useAuth } from "../../auth/AuthContext";
import api from "../../api/axios";
import { saveGuestProject, readGuestProject } from "../../utils/guestProject";
jest.mock("react-router-dom", () => {
  global.TextEncoder = require("util").TextEncoder;
  return jest.requireActual("react-router");
});
jest.mock("../../auth/AuthContext", () => ({useAuth:jest.fn()}));
jest.mock("../../api/axios", () => ({get:jest.fn(),post:jest.fn()}));
const project = {id:"d81a6e4c-65f5-4d35-a9ee-fb92cf83a7de",title:"Test project",description:"A detailed renovation project.",city:"1",profession:"2"};
const serverDraft = { ...project, id:12, city:1, profession:2, is_submitted:false };
const conflictResponse = {response:{status:409,data:{code:"guest_draft_conflict",draft:serverDraft}}};
const originalCrypto = global.crypto;
beforeAll(() => { global.crypto = {randomUUID:require("crypto").randomUUID}; });
afterAll(() => { global.crypto = originalCrypto; });
beforeEach(() => {
  jest.resetAllMocks(); sessionStorage.clear(); saveGuestProject(project);
  useAuth.mockReturnValue({user:null});
  api.get.mockImplementation(url=>Promise.resolve({data:url.includes("cities")?[{id:1,name:"Test city"}]:[{id:2,name:"Renovation"}]}));
});
function show() {
  return render(<MemoryRouter initialEntries={["/nis-projektin"]}><Routes>
    <Route path="/nis-projektin" element={<StartProject/>}/>
    <Route path="/register/customer" element={<div>Register now</div>}/>
    <Route path="/customer/jobrequests/create" element={<div>Continue draft</div>}/>
  </Routes></MemoryRouter>);
}
test("anonymous edits survive registration navigation without creating a server job", async () => {
  show(); await screen.findByText("Test city");
  fireEvent.change(screen.getByLabelText("Titulli"), {target:{value:"Updated project"}});
  fireEvent.click(screen.getByRole("button", {name:"Krijo llogari dhe vazhdo"}));
  expect(await screen.findByText("Register now")).toBeInTheDocument();
  expect(readGuestProject().title).toBe("Updated project");
  expect(api.post).not.toHaveBeenCalled();
});
test("failed import preserves data and retry uses the same idempotency key", async () => {
  useAuth.mockReturnValue({user:{role:"customer"}});
  api.post.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({data:serverDraft});
  show(); await screen.findByText("Test city");
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  await screen.findByRole("alert");
  expect(readGuestProject().id).toBe(project.id);
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  await screen.findByText("Continue draft");
  expect(api.post.mock.calls[0][1].client_draft_id).toBe(api.post.mock.calls[1][1].client_draft_id);
  expect(readGuestProject()).toBeNull();
});
test("edited retry preserves both versions and creates a separate draft only on explicit choice", async () => {
  useAuth.mockReturnValue({user:{role:"customer"}});
  const description = "New details entered after a lost network response.";
  api.post.mockRejectedValueOnce(new Error("offline"))
    .mockRejectedValueOnce(conflictResponse)
    .mockResolvedValueOnce({data:{...serverDraft,id:13,description}});
  show(); await screen.findByText("Test city");
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  await screen.findByRole("alert");
  fireEvent.change(screen.getByLabelText("Përshkrimi"), {target:{value:description}});
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  const openSaved = await screen.findByRole("link", {name:"Hap versionin e ruajtur"});
  expect(openSaved).toHaveAttribute("href", "/customer/jobrequests/create?draft=12");
  expect(readGuestProject()).toMatchObject({id:project.id,description});
  expect(screen.getByLabelText("Përshkrimi")).toHaveValue(description);
  expect(api.post).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", {name:"Ruaj ndryshimet si draft të ri"}));
  await screen.findByText("Continue draft");
  expect(api.post.mock.calls[0][1].client_draft_id).toBe(project.id);
  expect(api.post.mock.calls[1][1].client_draft_id).toBe(project.id);
  expect(api.post.mock.calls[2][1].client_draft_id).not.toBe(project.id);
  expect(api.post.mock.calls[2][1].description).toBe(description);
  expect(readGuestProject()).toBeNull();
});
test("a lost save-copy response retains its new key across reload and retry", async () => {
  useAuth.mockReturnValue({user:{role:"customer"}});
  api.post.mockRejectedValueOnce(conflictResponse).mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({data:{...serverDraft,id:13}});
  const page = show(); await screen.findByText("Test city");
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  fireEvent.click(await screen.findByRole("button", {name:"Ruaj ndryshimet si draft të ri"}));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ruajtja nuk u konfirmua"));
  const copyKey = readGuestProject().id;
  expect(copyKey).not.toBe(project.id);
  page.unmount(); show(); await screen.findByText("Test city");
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  await screen.findByText("Continue draft");
  expect(api.post.mock.calls[1][1].client_draft_id).toBe(copyKey);
  expect(api.post.mock.calls[2][1].client_draft_id).toBe(copyKey);
  expect(readGuestProject()).toBeNull();
});
test.each([serverDraft, {id:12}])("stale or incomplete success never erases newer local content: %j", async saved => {
  useAuth.mockReturnValue({user:{role:"customer"}});
  api.post.mockResolvedValueOnce({data:saved});
  show(); await screen.findByText("Test city");
  fireEvent.change(screen.getByLabelText("Titulli"), {target:{value:"New local project title"}});
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  await screen.findByRole("link", {name:"Hap versionin e ruajtur"});
  expect(readGuestProject().title).toBe("New local project title");
  expect(screen.queryByText("Continue draft")).not.toBeInTheDocument();
});
test("matching normalized content can be safely acknowledged", async () => {
  useAuth.mockReturnValue({user:{role:"customer"}});
  saveGuestProject({...project,title:`  ${project.title}  `,description:` ${project.description} `});
  api.post.mockResolvedValueOnce({data:serverDraft});
  show(); await screen.findByText("Test city");
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  await screen.findByText("Continue draft");
  expect(readGuestProject()).toBeNull();
});
test("company accounts cannot import customer drafts", async () => {
  useAuth.mockReturnValue({user:{role:"company"}});
  show(); await screen.findByText("Test city");
  fireEvent.click(screen.getByRole("button", {name:"Ruaj dhe vazhdo projektin"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("llogari klienti");
  expect(api.post).not.toHaveBeenCalled();
});
