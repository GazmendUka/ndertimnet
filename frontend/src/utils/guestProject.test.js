import { clearGuestProject, readGuestProject, saveGuestProject } from "./guestProject";
const project = { id: "d81a6e4c-65f5-4d35-a9ee-fb92cf83a7de", title: "Test project", description: "Project details", city: "1", profession: "2" };
beforeEach(() => { sessionStorage.clear(); jest.restoreAllMocks(); });
test("stores only in this tab and expires after 24 hours", () => {
  const now = Date.now(); jest.spyOn(Date, "now").mockReturnValue(now);
  expect(saveGuestProject(project)).toBe(true);
  expect(readGuestProject()).toMatchObject(project);
  expect(localStorage.getItem("ndertimnet.guest-project.v1")).toBeNull();
  Date.now.mockReturnValue(now+86400001);
  expect(readGuestProject()).toBeNull();
});
test("invalid or corrupt saved drafts are rejected", () => {
  sessionStorage.setItem("ndertimnet.guest-project.v1", "broken");
  expect(readGuestProject()).toBeNull();
  saveGuestProject({...project, city: { malicious: true }});
  expect(readGuestProject()).toBeNull();
});
test("blocked storage returns failure without throwing", () => {
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(saveGuestProject(project)).toBe(false);
  expect(() => clearGuestProject()).not.toThrow();
});
