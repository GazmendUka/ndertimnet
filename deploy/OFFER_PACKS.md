# Non-expiring offer pack (local implementation)

A one-time purchase buys 3 offers for EUR 19.95. There is no expiry, subscription,
renewal or automatic card debit. Standard and Pro retain their existing monthly
prices and date-dependent introductory pricing.

The catalog exposes offer_pack separately from plans. Purchase terms and the
server-generated purchase key are obtained from offer-pack-terms. buy-offer-pack
requires consent, representative name, current terms, a valid purchase key and web
platform. The server fixes the price and quantity; client amounts are ignored.
The same purchase key resumes the same charge, including after payment. An unpaid
pending pack is reused to avoid parallel orders. Existing checkout uncertainty
rules remain in force; no timeout releases a reservation.

Quota is available only while the pack charge is verified paid. Standard callback
verification checks amount, currency, merchant, environment and transaction identity.
Quota consumption locks the company and pack and records included_in_pack on the
sent offer's zero-value charge. Signed offer revisions do not consume again.
Priority is compensation credit, existing introductory free offers, usable paid
monthly quota, then a purchased pack. Purchased quota is separate from free and
compensation balances, and is shown in billing overview and offer quote.

Signed pack terms remain in the company's agreement history and read-only admin.
No native external-purchase link is introduced.

Release backend with migration payments.0013 before frontend. Migration adds the
pack table, optional usage reference, usage bound and charge kind; it does not
change old prices, subscriptions, free balances or paid records. Deploy only to
an explicitly approved environment. This file does not authorize deployment.

Validation: 149 payment/staging tests on isolated PostgreSQL including simultaneous
purchase/last-offer consumption, duplicate callbacks, wrong amount, expiry absence,
ownership, consent and native guards; 14 billing UI tests; Django system and
migration checks; frontend production build and separate ESLint (zero errors, one
pre-existing unused-import warning). Bank responses were mocked and external test
traffic blocked. Real sandbox checkout/callback acceptance remains to be run after
an approved release. No production or staging state was changed by these tests.

The reported Standard-to-59-EUR issue is not reproduced: live catalog and the new
Standard checkout regression both show EUR29. Consent and unpaid rows now label
plan name and amount. A screenshot or request context is still needed to identify
whether the observed59EUR was an existing Pro charge or a fresh Standard purchase.
