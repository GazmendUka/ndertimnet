import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import {
  isPushOptedIn,
  refreshPushToken,
  registerCurrentPushDevice,
} from "../services/notificationService";


function safeNotificationPath(value, role) {
  if (typeof value !== "string" || !value.startsWith(`/${role}/`)) return null;
  return value;
}

export default function NotificationRuntime() {
  const { access, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !access || !user?.role) return undefined;

    let active = true;
    const listeners = [];

    const start = async () => {
      if (Capacitor.getPlatform() === "android") {
        await Promise.all([
          FirebaseMessaging.createChannel({
            id: "messages",
            name: "Mesazhet",
            description: "Mesazhe të reja nga klientët dhe kompanitë",
            importance: 4,
            vibration: true,
          }),
          FirebaseMessaging.createChannel({
            id: "updates",
            name: "Përditësimet",
            description: "Oferta dhe përditësime të pagesave",
            importance: 3,
            vibration: true,
          }),
        ]).catch(() => undefined);
      }

      listeners.push(
        await FirebaseMessaging.addListener("tokenReceived", ({ token }) => {
          refreshPushToken(token).catch(() => undefined);
        })
      );
      listeners.push(
        await FirebaseMessaging.addListener("notificationReceived", ({ notification }) => {
          window.dispatchEvent(new CustomEvent("ndertimnet:push", { detail: notification?.data || {} }));
        })
      );
      listeners.push(
        await FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
          const path = safeNotificationPath(notification?.data?.path, user.role);
          if (path) navigate(path);
        })
      );

      if (!active) {
        listeners.forEach((listener) => listener.remove());
        return;
      }
      if (active && await isPushOptedIn()) {
        await registerCurrentPushDevice().catch(() => undefined);
      }
    };

    start().catch(() => undefined);
    return () => {
      active = false;
      listeners.forEach((listener) => listener.remove());
    };
  }, [access, navigate, user?.role]);

  return null;
}
