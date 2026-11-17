import { Capacitor } from "@capacitor/core";

const PRODUCTION_API_BASE_URL =
  "https://ndertimnet-r5dt.onrender.com/api/";

// A separate iPhone test build is pinned to staging; never fall back to production.
export const IS_IOS_STORE_SANDBOX = process.env.REACT_APP_IOS_STORE_SANDBOX === "true"
  && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
const IOS_STORE_TEST_API_BASE_URL = "https://ndertimnet-staging-backend.onrender.com/api/";

export const API_BASE_URL = IS_IOS_STORE_SANDBOX ? IOS_STORE_TEST_API_BASE_URL : Capacitor.isNativePlatform()
  ? PRODUCTION_API_BASE_URL
  : process.env.REACT_APP_API_BASE_URL || PRODUCTION_API_BASE_URL;

export const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
