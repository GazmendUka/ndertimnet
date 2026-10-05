# Ndertimnet billing — 2026-10-05

## Company subscription catalog

| Plan | Monthly price through 2026-12-31 | Regular monthly price | Sent offers/month |
| --- | --- | --- | --- |
| Standard | EUR 29 | EUR 49 | 10 |
| Pro | EUR 59 | EUR 79 | 30 |

The regular price applies to the first renewal starting on or after 2027-01-01,
including existing subscribers. The date boundary uses Europe/Stockholm. A period
starting before that boundary keeps its introductory amount for its full month.
The server's `pricing.py` is authoritative for catalog, checkout and each new period.
Paid charges and historical signed agreements are never rewritten.

There is no binding period or three-month notice. Cancellation ends the subscription
at the end of the current monthly period. New periods are not created beyond that date;
already incurred debt remains payable. A subscription that has not started can end
immediately unless its first payment has a pending/uncertain bank outcome.

New companies receive no automatic 25-offer allowance. Previously granted unused
free offers and compensation credits are preserved. The order on sending remains:
compensation credit, previously granted free offer, paid monthly quota. Without any
entitlement, sending is blocked until a subscription payment or the next period.
There is no per-lead, per-offer, early-chat or price-adjustment purchase.

A monthly quota is used once per offer/job when the offer is successfully signed and
sent. Drafts do not consume it. Revisions of a sent offer consume no further quota.
Unused monthly quota does not roll over. Unpaid due periods block subscription quota.
Contacts and chat open only after an offer has been sent; payment alone does not
send it. The separate project limit (normally 7, extendable to 12) still applies.
Accepted versions, customer decisions and agreement PDFs keep their existing rules.

## Plan changes and consent

`POST /api/billing/change-plan/` requires current terms, explicit consent and a
representative name. Upgrades and downgrades take effect at the next period boundary.
Current period price and quota are snapshotted and remain unchanged. A new consent
record is kept in `SubscriptionPlanChange`; the original signed agreement is immutable.
A pending bank outcome or canceled/unstarted subscription blocks plan changes.
Selecting the current plan cancels a previously scheduled change.

## Payment provider

RaiAccept hosted checkout remains the web provider. Collection is manual monthly
payment, not recurring automatic card debit. `recurring=None` remains in the bank
payload. Merchant credentials and merchant ID are required. Bank purchases remain
unavailable until configuration and acceptance testing are complete. No Stripe
integration is introduced by this update. StoreKit and Google Play Billing remain
unimplemented; native purchase links are not offered. Existing entitlements still work.

`PlatformCharge` records the amount due. `PlatformCheckout` records an immutable bank
attempt. Callbacks retrieve and verify bank transaction data, including merchant,
amount, currency, environment, transaction identity/type and success code. Browser
return URLs never prove payment. Pending outcomes remain pending until verified;
reconciliation never initiates charges. Historical offer payments can still settle
through callbacks, but new attempts for their charge IDs return 410.

Publication is separate: planned EUR 3.95 with the existing full introductory discount
controlled by `LISTING_INTRODUCTORY_FREE`. Moderation still requires a settled publication
charge. Payment for actual building work is made directly to the company. Advertising
is separate from Standard/Pro. Platform confirmations are not tax invoices.

## Migration and release

Deploy backend, frontend and migrations together:
- payments.0012_standard_pro: period snapshots, scheduled plan change fields, consent
  ledger and legacy plan mapping. Old 3/5-offer plans map to Standard; old 7-offer plans
  map to Pro. Existing periods retain quota and charge amounts; future periods use the
  new catalog. Historical signed texts remain untouched.
- accounts.0018_no_new_introductory_offers: default becomes zero for new companies;
  existing balances are not reset.

No production migration, deployment, real financial transaction or merchant activation
is performed by editing this code. Review migration effects against staging data before
release. Existing future three-month notice end dates are shortened to the current monthly
boundary by the migration; historical dates and already incurred payments are preserved.

Use the existing billing maintenance entry points and Render scheduling described in
`deploy/BILLING_RUNBOOK.md`. They still reconcile pending payments every five minutes
and prepare monthly periods daily. Do not auto-debit cards without the provider's actual
recurring API, merchant activation and explicit customer mandate.

## Validation

Tests cover pricing across Stockholm midnight at the 2027 boundary, renewal amounts,
paid history, one-time quota consumption, quota exhaustion, cancellation, deferred
plan changes and consent, pending historical payments, callback verification and
retired individual purchases. PostgreSQL concurrency tests are required for row-lock
behavior; mock gateway tests do not replace merchant sandbox acceptance.
