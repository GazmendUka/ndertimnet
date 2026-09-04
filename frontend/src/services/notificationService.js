import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

import api from "../api/axios";


const DEVICE_ID_KEY = "ndertimnet_notification_device_id";
const PUSH_OPT_IN_KEY = "ndertimnet_push_opt_in";

function createDeviceId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function getNotificationDeviceId() {
  const stored = await Preferences.get({ key: DEVICE_ID_KEY });
  if (stored.value) return stored.value;
  const deviceId = createDeviceId();
  await Preferences.set({ key: DEVICE_ID_KEY, value: deviceId });
  return deviceId;
}

export async function isPushOptedIn() {
  const stored = await Preferences.get({ key: PUSH_OPT_IN_KEY });
  return stored.value === "true";
}

export async function registerCurrentPushDevice({ requestPermission = false } = {}) {
  if (!Capacitor.isNativePlatform()) return { supported: false, permission: "unavailable" };

  const support = await FirebaseMessaging.isSupported();
  if (!support.isSupported) return { supported: false, permission: "unavailable" };

  let permission = await FirebaseMessaging.checkPermissions();
  if (requestPermission && ["prompt", "prompt-with-rationale"].includes(permission.receive)) {
    permission = await FirebaseMessaging.requestPermissions();
  }
  if (permission.receive !== "granted") {
    return { supported: true, permission: permission.receive, registered: false };
  }

  const [{ token }, deviceId] = await Promise.all([
    FirebaseMessaging.getToken(),
    getNotificationDeviceId(),
  ]);
  await api.post("/notifications/devices/register/", {
    token,
    device_id: deviceId,
    platform: Capacitor.getPlatform(),
  });
  await Preferences.set({ key: PUSH_OPT_IN_KEY, value: "true" });
  return { supported: true, permission: "granted", registered: true };
}

export async function refreshPushToken(token) {
  if (!token || !Capacitor.isNativePlatform()) return;
  if (!(await isPushOptedIn())) return;
  const deviceId = await getNotificationDeviceId();
  await api.post("/notifications/devices/register/", {
    token,
    device_id: deviceId,
    platform: Capacitor.getPlatform(),
  });
}

export async function deactivateCurrentPushDevice() {
  if (!Capacitor.isNativePlatform()) return;
  await Preferences.set({ key: PUSH_OPT_IN_KEY, value: "false" });
  try {
    const deviceId = await getNotificationDeviceId();
    await api.post("/notifications/devices/unregister/", { device_id: deviceId });
  } finally {
    await FirebaseMessaging.deleteToken().catch(() => undefined);
  }
}

export function getNotificationPreferences() {
  return api.get("/notifications/preferences/");
}

export function updateNotificationPreferences(changes) {
  return api.patch("/notifications/preferences/", changes);
}
