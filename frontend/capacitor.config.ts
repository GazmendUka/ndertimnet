import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ndertimnet.app",
  appName: "Ndërtimnet",
  webDir: "build",
  backgroundColor: "#ffffff",
  loggingBehavior: "production",
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#ffffff",
    },
    Keyboard: {
      resize: "body",
    },
    FirebaseMessaging: {
      presentationOptions: ["alert", "badge", "sound"],
    },
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/messaging": { symlink: true },
        },
      },
    },
  },
};

export default config;
