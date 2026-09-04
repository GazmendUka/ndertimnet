import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export const isNativeApp = () => Capacitor.isNativePlatform();

export async function openExternalUrl(url) {
  if (!url) return;

  if (isNativeApp()) {
    await Browser.open({
      url,
      presentationStyle: "popover",
    });
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function openPaymentUrl(url, returnPath) {
  if (!url) return;

  if (!isNativeApp()) {
    window.location.assign(url);
    return;
  }

  let finishedListener;
  finishedListener = await Browser.addListener("browserFinished", () => {
    finishedListener?.remove();
    window.location.assign(returnPath);
  });

  await Browser.open({
    url,
    presentationStyle: "fullscreen",
  });
}
