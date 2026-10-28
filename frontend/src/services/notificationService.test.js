import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import api from "../api/axios";

jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: jest.fn(), getPlatform: jest.fn() } }));
jest.mock("@capacitor/preferences", () => ({ Preferences: { get: jest.fn(), set: jest.fn() } }));
jest.mock("@capacitor-firebase/messaging", () => ({ FirebaseMessaging: {
  isSupported: jest.fn(), checkPermissions: jest.fn(), requestPermissions: jest.fn(), getToken: jest.fn(), deleteToken: jest.fn(),
} }));
jest.mock("../api/axios", () => ({ post: jest.fn() }));

const originalProjectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
process.env.REACT_APP_FIREBASE_PROJECT_ID = "new-push-project";
const { registerCurrentPushDevice, refreshPushToken, deactivateCurrentPushDevice } = require("./notificationService");

afterAll(() => {
  if (originalProjectId === undefined) delete process.env.REACT_APP_FIREBASE_PROJECT_ID;
  else process.env.REACT_APP_FIREBASE_PROJECT_ID = originalProjectId;
});

beforeEach(() => {
  jest.resetAllMocks();
  Capacitor.isNativePlatform.mockReturnValue(true);
  Capacitor.getPlatform.mockReturnValue("android");
  Preferences.get.mockImplementation(async ({ key }) => ({ value: key.includes("opt_in") ? "true" : "test-device" }));
  Preferences.set.mockResolvedValue(undefined);
  FirebaseMessaging.isSupported.mockResolvedValue({ isSupported: true });
  FirebaseMessaging.checkPermissions.mockResolvedValue({ receive: "granted" });
  FirebaseMessaging.getToken.mockResolvedValue({ token: "synthetic-test-token" });
  FirebaseMessaging.deleteToken.mockResolvedValue(undefined);
  api.post.mockResolvedValue({ data: { registered: true } });
});

test.each(["android", "ios"])("%s registration identifies its Firebase project", async (platform) => {
  Capacitor.getPlatform.mockReturnValue(platform);
  await expect(registerCurrentPushDevice()).resolves.toMatchObject({ registered: true });
  expect(api.post).toHaveBeenCalledWith("/notifications/devices/register/", {
    token: "synthetic-test-token", device_id: "test-device", platform, firebase_project_id: "new-push-project",
  });
  expect(FirebaseMessaging.requestPermissions).not.toHaveBeenCalled();
});

test("token renewal preserves project routing", async () => {
  await refreshPushToken("synthetic-renewed-token");
  expect(api.post).toHaveBeenCalledWith("/notifications/devices/register/", expect.objectContaining({
    token: "synthetic-renewed-token", firebase_project_id: "new-push-project",
  }));
});

test("an upgraded installation rotates its previous project token before registering", async () => {
  await registerCurrentPushDevice();
  expect(FirebaseMessaging.deleteToken).toHaveBeenCalledTimes(1);
  expect(FirebaseMessaging.deleteToken.mock.invocationCallOrder[0]).toBeLessThan(FirebaseMessaging.getToken.mock.invocationCallOrder[0]);
  expect(Preferences.set).toHaveBeenCalledWith({ key: "ndertimnet_push_firebase_project", value: "new-push-project" });
});

test("an installation already registered in this project keeps its current token", async () => {
  Preferences.get.mockImplementation(async ({ key }) => ({ value: key === "ndertimnet_push_firebase_project" ? "new-push-project" : "test-device" }));
  await registerCurrentPushDevice();
  expect(FirebaseMessaging.deleteToken).not.toHaveBeenCalled();
});

test("permission is requested only after an explicit user action", async () => {
  FirebaseMessaging.checkPermissions.mockResolvedValue({ receive: "prompt" });
  await expect(registerCurrentPushDevice()).resolves.toMatchObject({ registered: false });
  expect(FirebaseMessaging.requestPermissions).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
  FirebaseMessaging.requestPermissions.mockResolvedValue({ receive: "granted" });
  await expect(registerCurrentPushDevice({ requestPermission: true })).resolves.toMatchObject({ registered: true });
  expect(FirebaseMessaging.requestPermissions).toHaveBeenCalledTimes(1);
});

test("opted out devices do not register renewed tokens", async () => {
  Preferences.get.mockResolvedValue({ value: "false" });
  await refreshPushToken("synthetic-renewed-token");
  expect(api.post).not.toHaveBeenCalled();
});

test("the website does not use native push registration", async () => {
  Capacitor.isNativePlatform.mockReturnValue(false);
  await expect(registerCurrentPushDevice()).resolves.toMatchObject({ supported: false });
  expect(api.post).not.toHaveBeenCalled();
  expect(FirebaseMessaging.getToken).not.toHaveBeenCalled();
});

test("failed registration does not save consent as successfully configured", async () => {
  api.post.mockRejectedValue(new Error("synthetic network failure"));
  await expect(registerCurrentPushDevice()).rejects.toThrow("synthetic network failure");
  expect(Preferences.set).not.toHaveBeenCalledWith({ key: "ndertimnet_push_opt_in", value: "true" });
  expect(Preferences.set).not.toHaveBeenCalledWith({ key: "ndertimnet_push_firebase_project", value: "new-push-project" });
});

test("logout deletes the native token even if server unregister fails", async () => {
  api.post.mockRejectedValue(new Error("synthetic network failure"));
  await expect(deactivateCurrentPushDevice()).rejects.toThrow("synthetic network failure");
  expect(Preferences.set).toHaveBeenCalledWith({ key: "ndertimnet_push_opt_in", value: "false" });
  expect(FirebaseMessaging.deleteToken).toHaveBeenCalled();
});
