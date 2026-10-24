import { CONTENT_RULES_VERSION, acceptContentRules, hasAcceptedContentRules, isContentWrite } from "./contentRules";
beforeEach(() => localStorage.clear());
test("acceptance belongs to the current account and version", () => {
  expect(hasAcceptedContentRules(1)).toBe(false);
  acceptContentRules(1);
  expect(hasAcceptedContentRules(1)).toBe(true);
  expect(hasAcceptedContentRules(2)).toBe(false);
  localStorage.setItem("ndertimnet:content-rules:1", "old-version");
  expect(hasAcceptedContentRules(1)).toBe(false);
  expect(CONTENT_RULES_VERSION).toBe("2026-10-24-v1");
});
test.each(["offers/", "offers/7/messages/", "offers/7/review/", "offers/7/sign/", "jobrequests/", "jobrequests/drafts/import-guest/", "leads/leadmessages/", "accounts/profile/company/", "marketing/campaigns/"])("content write %s requires acceptance", url => {
  expect(isContentWrite({ method: "post", url })).toBe(true);
});
test.each(["accounts/delete/", "offers/7/chat-block/", "offers/7/chat-reports/", "offers/7/messages/read/", "push/devices/", "token/refresh/", "billing/subscription/", "marketing/campaigns/4/withdraw/"])("safety or service request %s remains available", url => {
  expect(isContentWrite({ method: "post", url })).toBe(false);
});
test("browsing remains available without accepting", () => {
  expect(isContentWrite({ method: "get", url: "offers/7/messages/" })).toBe(false);
});
