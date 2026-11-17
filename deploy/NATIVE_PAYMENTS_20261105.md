# Native payment preparation — 5 November 2026

> Historical baseline. The iOS-only update of 17 November is recorded at the end.
> Do not treat the old agreement/product status below as a current readback.

## Current operational state

This branch prepares native checkout; it does **not** activate or publish payments.
Website production/staging were read back on this date: bank checkout is enabled,
Bazë is 3 non-expiring offers for EUR19.95, Standard is 10/month for EUR29,
and Pro is 30/month for EUR59. The reference revision is `9453124`.
Existing free balances and the configurable 20-offer registration allowance remain.

Actual blockers verified in the owner's consoles:

- Google Play requests creation of a merchant payments profile. The user confirmed
  that the seller must remain the existing Kosovo company. Google's current list
  permits developer registration in Kosovo but **not merchant registration**.
  Do not substitute an inaccurate country/address, open another financial entity,
  or claim that a bank button bypasses the digital-purchase rules.
- App Store Connect login was verified. Paid Apps Agreement is **New**, Free Apps
  Agreement is Active, and Apple requires **Edit Legal Entity** before signing the
  paid agreement. The owner must enter accurate information and accept contracts.
  The app currently has **no in-app products**. Its old public1.7 submission is
  still Rejected; this branch does not alter or reply to that submission.
  The user subsequently opened Edit Legal Entity: Country or Region is already
  **Kosovo** and disabled, as are name/type. The editable fields are address1/2,
  city, state/province and postal code. The user was guided to check those and
  save themselves, then reopen the paid agreement. No country substitution or
  forced unlocking of the disabled field was attempted.
- No native store product, publisher credential, merchant account, contract,
  real purchase, notification or distribution was created by this task.

Sources checked:

- https://support.google.com/googleplay/android-developer/answer/9306917
- https://support.google.com/googleplay/android-developer/answer/9858738
- https://developer.apple.com/app-store/review/guidelines/#in-app-purchase

Keep website purchases usable in the apps through the same authenticated company
balance. Native checkout stays off until a supported merchant arrangement and
store-specific acceptance tests are actually complete. No external purchase CTA
is introduced into the app when checkout is disabled.

## Implementation

- Capacitor's native purchase bridge is `@capgo/native-purchases`8.9.6. Auto-finish
  is disabled in native configuration and each purchase. Server validation must
  succeed before Apple finishes or Google consumes/acknowledges a transaction.
- App1.9 is prepared locally (Android11, iOS9). These numbers are not uploaded or
  reserved in the stores. Verify latest occupied numbers before distribution.
- `NativeSubscriptionBilling` shares company quotas, current contract, history
  and cancellation with the web. When checkout is enabled, localized product
  prices/names come from the store; missing products have no buy button.
  Standard/Pro changes remain scheduled for the next period, not immediate charges.
- All monthly collection remains **manual**, matching the website. Do not quietly
  replace it with auto-renewing subscriptions. Bazë never expires. Standard/Pro
  license one monthly quota, unused quota does not carry over.
- Pending, canceled and failed purchases do not grant quota. A unique transaction
  hash plus company/charge row locks prevent replay and repeated delivery.
- Apple uses an authenticated Server API read and the official SignedDataVerifier
  with checked-in public Apple roots and online certificate checks. Google checks
  its ProductPurchase and Order APIs, app/product/account binding, quantity, state,
  test environment and actual price/currency. Store-funded discounts may reduce
  the consented amount; an increased price is rejected for investigation.
- Store receipts retain the actual store amount/currency separately from the
  website's EUR reference charge. History displays that receipt when present;
  refunded receipts keep their original amount/currency. Do not sum different
  receipt currencies as EUR or present gross receipts as net merchant payouts.
- Native consent text and representative are archived per attempt. No card/CVV
  is collected. Purchase tokens stay backend-private and are excluded from APIs.
- Restore/recovery processes unfinished purchases, including after restart and
  app resume. A transaction belonging to another account is not transferred or
  finished. Overlapping StoreKit callbacks finish only once.
- Native/bank attempts cannot overlap for one charge. An uncertain store attempt
  blocks cancellation/plan changes until resolved. Explicit SDK cancellation
  releases the attempt, while network timeouts remain recoverable.
- `reconcile_store_purchases` is dry-run by default. It is integrated into existing
  reconciliation only when store billing is explicitly enabled; validated refunds
  remove remaining purchased entitlement and end a refunded monthly contract.
- Privacy text is prepared asv1.2; startsides/menus/Hero are unchanged.

## Store configuration still required

The following IDs are a proposed mapping, not products that already exist:

| Code | Product ID | Entitlement | Apple type | Google type |
|---|---|---|---|---|
| offers_3 | com.ndertimnet.app.offers3 | 3 offers, no expiry | Consumable | One-time consumable |
| standard | com.ndertimnet.app.standard.month |10offers/month, manual payment | Non-renewing subscription | One-time monthly license |
| pro | com.ndertimnet.app.pro.month |30offers/month, manual payment | Non-renewing subscription | One-time monthly license |

Confirm these product semantics with each store before activating sales. Configure
localized metadata, permitted price points, territories, tax/banking/agreements,
and review material in the appropriate app. Do not assume exact web EUR prices
exist as Apple price points or that store commissions are covered by web prices.
The consumer must see the actual local store price before consenting.
Store pricing for the website's January2027 price change and any historical
lower-priced arrears requires its own explicit product/pricing configuration.

Protected backend **and reconciliation-worker** settings, never frontend values:

- `STORE_BILLING_ENABLED=false` by default.
- `STORE_APPLE_KEY_ID`, `STORE_APPLE_ISSUER_ID`, `STORE_APPLE_PRIVATE_KEY`: an
  authorized App Store Server API purchase key, not the APNs key.
- `STORE_GOOGLE_CREDENTIALS_JSON`: a dedicated authorized Publisher service account
  with the minimum rights to verify/consume this app's purchases and read orders.
  Do not assume the Firebase push credential has Publisher rights.
- `STORE_PRODUCT_IDS`: optional JSON mapping by`ios`/`android`, code→product ID.
- `STORE_BILLING_ENVIRONMENT=Production` by default. Use `Sandbox` only in isolated
  tests. On the production API, `STORE_SANDBOX_COMPANY_IDS` may designate **only**
  separate synthetic test companies; never grant sandbox credit to real companies.
- Staging requires separate `STAGING_STORE_BILLING_ENABLED=true` and forces Sandbox.

Before a future activation: apply additive payments0014 and deploy backend/worker
first. Enable only the store with valid credentials/agreement/products. Test real
store sandbox purchases on phones: all three products, cancellation/decline,
pending approval, interrupted network, restore/reinstall, duplicate callbacks,
cross-account attempts, quota consumption, manual monthly renewal, plan change,
refund and shared website state. Validate refunds/acknowledgment timing and queued
pending purchases against actual store responses, not just mocks. Consider store
notifications in addition to reconciliation for events while an app is closed.

This is not yet verified end-to-end with either live store. Do not describe it as
production-ready or publish it on the strength of automated tests alone.

## Local validation

- 338 backend tests passed on an isolated PostgreSQL17 cluster; external bank,
  mail and store network connections were blocked. Includes native account
  ownership, forged Apple proof rejection, pending/revoked payments, duplicate
  fulfillment, local currencies/coupons, manual monthly quota and row-lock races.
- 207 frontend tests/28suites passed. Full production web build and16SEO pages passed.
- Django system/migration checks passed. New migration0014 is additive and has
  been applied only by the local test runner, never to production/staging.
- Android debug build/lint and iOS Release simulator compilation passed with10
  plugins, including the native purchase bridge. These are compilation checks,
  not signed store uploads or physical-device purchase tests.
- Local preview uses the real NativeSubscriptionBilling component with separate
  synthetic services. It does not call the real backend/store or debit a card.
  Preview fixtures exist only outside the repository, not in app source/bundles.
- A legacy subscription test fixture expired on the real November5 anniversary;
  its first-payment/quota tests now explicitly freeze their intended October date.
  Application billing dates/rules were not changed to make the test pass.


## iOS continuation — 17 November 2026

The owner explicitly chose free company registration **inside iOS**, with Apple
purchases, and approved reading/copying only commit `a9a44ea` from the historical
Ndertimnet worktree. Its working files, other apps/windows and Android source
were not changed. New isolated branch: `codex/ios-iap-20261117`, on the saved
`513ccca` iOS branch; net source changes are based on verified main `e669150`.
The old consumption-only iOS1.9 candidate is superseded, not published.

- The prior purchase flow is reused, retaining **manual** monthly collection.
  No auto-renewable subscription or automatic card debit was authorized/added.
- Only iOS selects the new native purchase screen. Android retains the previous
  disabled native purchase screen, with no Android project/version changes.
  Web checkout remains. iOS bank-browser checkout is explicitly rejected.
- Free business registration is restored on iOS. New companies can report
  acquisition channel `ios`, `android`, `web`, or `unknown`. This is descriptive,
  client-reported metadata, never an authorization or billing control. Existing
  accounts stay `unknown`; no historical attribution is invented. Admin has a
  column/filter. This counts completed registrations, not a complete funnel.
- New additive migrations: payments0014 and accounts0021. Apply them before
  serving code which reads StoreCheckout. No production/staging migration run.
- Historical-price refunds no longer revoke a later paid month; the refunded
  month cannot supply quota or become an unpaid debt. Refunded unfinished Apple
  transactions are finished **after** server verification, without granting
  quota, allowing later recovery. Invalid or other-account purchases remain
  unfinished. Product type must match consumable vs non-renewing subscription.
- All 342 backend tests passed on a new isolated PostgreSQL17 instance, including
  concurrent prepare/delivery. 214 frontend tests/29 suites passed. Django check,
  migration consistency, production web build/16SEO and signed iOS1.10(10) archive,
  local export and simulator build passed. No genuine Apple purchase was made;
  provider success/refund/pending responses in tests are synthetic.
- The owner reports Paid Apps Agreement active and banking/tax complete. This
  is owner-confirmed, not an independent financial-console readback. Fresh Apple
  API read showed zero IAP products initially, latest uploaded build8 valid.
  Three **unpublished** product drafts have now been created and read back:
  offers_3=`6835746215`, standard=`6835746171`, pro=`6835746072`.
  The product identifiers/types in the table above are unchanged and match them.
  Exact DEU euro-reference price points exist for19.95,29.00,59.00. DEU is a
  pricing reference, never a substitution for the seller's Kosovo country.
  Apple rejected saving price schedules with403/FORBIDDEN_ERROR; do not retry or bypass that denial. Product versions/descriptions can be edited with the current key. Detailed metadata/price/readback status is in the delivery JSON; do not infer
  approval/availability from product creation. No App Review submission/message.
- The Apple Server API capability probe used synthetic nonexistent transaction0:
  Sandbox400/4000006 and Production401. This is **not** a successful authenticated
  purchase verification and does not prove the upload key is a usable purchase
  key. The owner confirmed a new purchase key needs to be created and was guided to create/download it locally as Ndertimnet köpverifiering. Confirm an appropriate In-App Purchase key before server activation;
  never place private keys in this repository, examples, logs or chat.

Remaining before live testing/release: complete draft metadata/pricing/territory
availability and real purchase screenshot, confirm purchase-key access, explicitly
authorize the staging backend/worker deployment and TestFlight upload, wire protected
Sandbox settings to separate synthetic companies, then exercise Apple Sandbox on
an iPhone (including refunds, interruption, duplicate delivery, shared balances and
registration). Native purchases remain off by default. Configure the website's
January2027 price transition separately in Apple before launching sales; no future
price increase was silently scheduled. No current Small Business Program rate or
Apple approval is assumed. Existing production website/API and distributed apps
have not been changed by this local code work.
