import { Capacitor } from "@capacitor/core";
jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: jest.fn(), getPlatform: jest.fn() } }));
const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });
function configuration(platform, flag) {
  Capacitor.isNativePlatform.mockReturnValue(platform !== "web"); Capacitor.getPlatform.mockReturnValue(platform);
  if (flag === undefined) delete process.env.REACT_APP_IOS_STORE_SANDBOX;
  else process.env.REACT_APP_IOS_STORE_SANDBOX = flag;
  let result; jest.isolateModules(() => { result = require("./api"); }); return result;
}
test("explicit iOS Store Sandbox build pins requests and media to staging even with a production override", () => {
  process.env.REACT_APP_API_BASE_URL = "https://ndertimnet-r5dt.onrender.com/api/";
  const result = configuration("ios", "true");
  expect(result.IS_IOS_STORE_SANDBOX).toBe(true);
  expect(result.API_BASE_URL).toBe("https://ndertimnet-staging-backend.onrender.com/api/");
  expect(result.MEDIA_BASE_URL).toBe("https://ndertimnet-staging-backend.onrender.com");
});
test.each([undefined, "false", "1"])("normal iOS %s stays on production", flag => {
  const result = configuration("ios", flag);
  expect(result.IS_IOS_STORE_SANDBOX).toBe(false);
  expect(result.API_BASE_URL).toBe("https://ndertimnet-r5dt.onrender.com/api/");
});
test("Android does not opt into iOS Sandbox and web retains its configured endpoint", () => {
  process.env.REACT_APP_API_BASE_URL = "https://web.example.test/api/";
  expect(configuration("android", "true").API_BASE_URL).toBe("https://ndertimnet-r5dt.onrender.com/api/");
  const web = configuration("web", "true"); expect(web.API_BASE_URL).toBe("https://web.example.test/api/"); expect(web.IS_IOS_STORE_SANDBOX).toBe(false);
});
