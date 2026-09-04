import { Capacitor } from "@capacitor/core";

const PRODUCTION_API_BASE_URL =
  "https://ndertimnet-r5dt.onrender.com/api/";

export const API_BASE_URL = Capacitor.isNativePlatform()
  ? PRODUCTION_API_BASE_URL
  : process.env.REACT_APP_API_BASE_URL || PRODUCTION_API_BASE_URL;

export const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");
