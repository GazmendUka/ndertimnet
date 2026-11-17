import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { openExternalUrl } from "./mobile";

const APP_HOSTS = new Set([
  "ndertimnet.com",
  "www.ndertimnet.com",
  "app.ndertimnet.com",
]);

function getInternalPath(url) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === "ndertimnet:") {
      const customSchemePath = parsed.hostname
        ? `/${parsed.hostname}${parsed.pathname}`
        : parsed.pathname || "/";
      return `${customSchemePath}${parsed.search}${parsed.hash}`;
    }

    if (APP_HOSTS.has(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

export default function MobileRuntime() {
  const navigate = useNavigate();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const listeners = [];
    let disposed = false;

    const register = async () => {
      const status = await Network.getStatus();
      if (!disposed) setOffline(!status.connected);

      await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
      await StatusBar.setBackgroundColor({ color: "#ffffff" }).catch(
        () => undefined
      );
      await SplashScreen.hide().catch(() => undefined);

      listeners.push(
        await Network.addListener("networkStatusChange", (nextStatus) => {
          setOffline(!nextStatus.connected);
        })
      );

      listeners.push(
        await CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
          const path = getInternalPath(url);
          if (!path) return;

          await Browser.close().catch(() => undefined);
          navigate(path);
        })
      );

      if (Capacitor.getPlatform() === "android") {
        listeners.push(
          await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              CapacitorApp.minimizeApp();
            }
          })
        );
      }
    };

    const handleExternalLink = (event) => {
      const link = event.target.closest?.("a[target='_blank']");
      if (!link?.href || !/^https?:/i.test(link.href)) return;

      event.preventDefault();
      openExternalUrl(link.href).catch(() => undefined);
    };

    document.addEventListener("click", handleExternalLink);
    register().catch(() => SplashScreen.hide().catch(() => undefined));

    return () => {
      disposed = true;
      document.removeEventListener("click", handleExternalLink);
      listeners.forEach((listener) => listener.remove());
    };
  }, [navigate]);

  if (!offline) return null;

  return (
    <div className="mobile-offline-banner" role="status">
      Nuk ka lidhje me internetin. Po provojmë përsëri…
    </div>
  );
}
