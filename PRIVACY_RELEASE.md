# Ndertimnet privacy pages — 2026-09-13

Public URLs:
- https://ndertimnet.com/privacy.html
- https://ndertimnet.com/account-deletion.html

These standalone Albanian HTML pages do not require authentication or JavaScript.
They are copied by the frontend production build. Links are included in the public
footer/mobile menu, authenticated menus and both registration forms. Native menu
links use the system browser and will be available in newly built app binaries;
publishing the website alone does not update an already installed bundled app.

The operator supplied the privacy/deletion contact address in the published pages.
Monitor that mailbox and process verified requests manually. The existing Django
account-delete endpoint only deactivates accounts; this release does not implement
permanent deletion or change database, payment, push or email configuration.

Before claiming the entire app is ready for store review:
- Confirm actual retention obligations and provider backup retention with the operator.
- Establish the manual erasure/anonymisation workflow, including uploaded media,
  notification tokens, transaction/contract exceptions and backup recovery handling.
- Explain any retained categories, reasons and periods to the requester, verify
  identity proportionately, and never request passwords, OTPs or card details.
- Verify live provider configuration and contracts/international-transfer safeguards.
- Complete Play Data safety and account-deletion declarations against the released
  binary and actual practices; a policy page alone does not establish compliance.
- Have the operator/legal adviser review the policy as practices or law change.

No fixed retention period, postal address, enabled wallet/payment capability or
complete legal/store approval is asserted without supporting confirmation.

Validation: production frontend build; LegalLinks Jest tests (web and native,
including browser failure); Django check and makemigrations --check --dry-run;
accounts and pushnotifications tests; public HTML/link/overflow checks at
320, 390, 768 and 1440 pixels with JavaScript disabled.

The release was prepared in an isolated checkout of remote main (4a196bd), leaving
unrelated local profile/layout changes untouched. PROJECT_MEMORY.md in the supplied
Documents workspace could not be read because macOS denied access; implementation
and statements were checked against the accessible source, not assumed from memory.
