# Ndertimnet platform billing — current rules (2026-09-20)

## Publication and company prices

- Publication regular price EUR 3.95 (`LISTING_REGULAR_PRICE`), initially discounted to
  zero (`LISTING_INTRODUCTORY_FREE=true`). Turning the discount off requires payment
  before moderation can publish a job. Advertising campaigns are invoiced separately.
- Companies receive 25 introductory sent offers once, not monthly. Drafting and browsing
  are free. On sending, consume an eligible compensation credit first, then introductory
  allowance, then paid subscription quota, otherwise a verified individual fee.
- The individual fee is 1% of the offered total, rounded UP to the next .95, minimum
  EUR 2.95 and maximum EUR 19.95. Hourly offers require estimated hours; the server uses
  hourly rate × hours, rounded to cents. Estimated totals are labelled as estimates.
- Plans: EUR 39.95/3, 54.95/5, 69.95/7 offers monthly; unused quota does not roll over.
  Plan selection compares the price against individual fees for the same number of
  offers, and shows effective cost if all included offers are used. Additional offers
  use individual fees. A subscription starts with its first verified payment even if
  free offers remain. A missing monthly payment blocks subscription quota.
- Cancellation requires at least three calendar months' paid notice and ends at the
  first monthly billing boundary on/after that date. The exact date is shown after
  cancellation. No months are added beyond that date. An unstarted subscription can be
  canceled immediately only if its first payment is not pending/uncertain.

## Sending, contact and versions

Signing sends the offer and atomically verifies payment/consumes quota. Payment alone
or a legacy unlock flag never exposes contacts. A sent offer opens phone/email and chat
for both parties. Contact information is allowed in sent offers and chat. Drafts remain
hidden from the customer; company profiles only expose contact information to the
company itself, staff or a customer with a sent offer from that company.

The accepted agreement has its own `Offer.accepted_version` pointer. Existing accepted
agreements are backfilled to their original version without rewriting the text or price.
Editing an accepted offer creates a draft and leaves the accepted pointer/status intact.
Sending a proposed change requires signature and any fee due. Customers see signed
proposals, the accepted version and sent-version history; no unsigned drafts are exposed,
including through nested job serializers or history. The customer must decide the exact
version ID. A rejected change leaves the previously accepted agreement in place. An
accepted change updates the accepted pointer and recorded winner price. Retry of an
already accepted version is idempotent; superseded/rejected proposals cannot be accepted.

Both parties see the full accepted text and version history. PDFs remain available only
for accepted agreements and use the accepted version, never an unsigned/unapproved change.
Phone discussions are allowed; UI asks parties to document and approve price and scope
changes on the platform. This is agreement documentation, not a promise to prevent
all off-platform agreements or a guarantee about the outcome of a legal dispute.

The former unilateral `/api/billing/report-offer-price/` returns 410. Historical
OfferPriceReport rows are preserved but no longer override current version pricing.
Changes must follow the version/sign/customer-decision workflow.

## Price-increase threshold

For an individually paid offer, use the highest quoted price on its confirmed nonzero
fee records as the billing baseline. A total increase LESS THAN EUR 100 from that baseline
requires no additional fee. At EUR 100 or more, require only:

`max(0, fee(current offered total) - sum(confirmed fees already paid))`

The EUR 19.95 cap applies cumulatively, not per change. Small revisions do not reset the
baseline. Neither lowering the price nor changing scope/text resets it or refunds fees.
A newly paid adjustment sets the next baseline through its immutable payment record.
Example: 1000 → 1099.99 is free; 1000 → 1100 requires EUR 1 additional fee (10.95 → 11.95).
The company sees the difference before paying and sending. The fee covers submission,
not customer acceptance; rejecting a sent proposal does not refund that fee.

Free, compensation-credit and subscription offers remain included across revisions with
no extra quota consumption or supplementary fee. Historical signed offers without new
billing records remain grandfathered. Pending checkouts and paid-but-unsent charges
freeze editing. An accepted-offer amendment must still be sent after verified payment;
payment alone never creates customer acceptance or silently publishes a draft.

## Offer capacity

The default maximum is seven offers; the customer may increase it by five. Checkout and
signing lock Company → JobRequest → Offer. Acceptance locks JobRequest → Offer without
implicitly locking joined Company rows. Capacity is checked before creating a bank
attempt and before consuming free/included quota. A draft alone reserves nothing.
A pending attempt reserves a place until its verified result; a confirmed initial
payment keeps the place until sending. A failed/canceled attempt releases it. Signed
history retains its place through revisions. Remaining capacity includes reservations.
An unsent offer replaced by a compensation credit can no longer be sent and releases its
paid reservation. Compensation never permits another send of the source offer.

No timer releases an uncertain bank outcome. `reconcile_payments --apply` checks pending
orders against the bank and shares the callback verification rules. It requires a terminal
order as well as failed transactions before releasing a failed reservation. Empty results,
missing order IDs, mismatched responses and multiple paid purchases remain reserved for
manual investigation. Django admin shows last check and a sanitized explanation and offers
a bank verification action to staff with payments.change_platformcheckout. No admin action
can mark an unverified payment as paid or failed. Run a batch every five minutes; the default
command without --apply only lists work and makes no bank requests.

The read-only order query follows the merchant SDK's GET /orders/{id}/transactions:
https://github.com/SmartBase-SK/raiaccept-node/blob/main/src/api/RaiAcceptAPIApi.ts
This reference does not replace merchant sandbox verification or document recurring debits.
If a verified initial offer payment cannot be used because the job closed before sending,
the system issues one credit automatically. Sent offers are never compensated by this rule.
Both closure and payment callbacks trigger this check; reconciliation repairs missed checks. PostgreSQL concurrent
checkout/sign/accept testing and real bank sandbox tests remain deployment prerequisites;
local automated tests use SQLite and mocked gateway responses.

## Compensation credits

`OfferCredit` is an auditable ledger separate from the 25 introductory offers. Only staff
with `payments.issue_offer_credit` may grant a credit in Django admin. A grant requires
an eligible paid or consumed offer, one of the following confirmed reasons and a written
case/evidence reference (at least ten characters):

- Confirmed false request.
- Confirmed duplicate request.
- Confirmed technical failure preventing a paid offer from being sent (not already sent).
- Automatically verified paid-but-unsent offer whose job closed before sending (system only).

Silence, non-acceptance, losing after sending and buyer/seller changing their mind are not
grant reasons. A closure is compensated only if a verified paid offer was never sent. Pending bank outcomes must be resolved first.
Automatic grants have issued_by=NULL and an evidence reference to the verified charge and job.
One credit maximum per source offer/company/job, including any fee adjustments. No cash
refund is performed. A credit covers one sent offer on a DIFFERENT job with no additional
offer fee; it has no expiry and survives subscription cancellation. Redemption locks the
company, occurs only on successful sending, and rolls back if signing fails. It takes
priority over introductory and subscription quota. Credits/usage are visible on the
company payments page; internal evidence is not exposed through the company API.

Grant records are read-only after creation in admin. The grant permission, original
payment and evidence must be checked by support; the system does not claim to determine
whether a request is false automatically. Earlier legacy Payment-only records require
manual migration/review rather than inventing a new qualifying PlatformCharge.

## Platform inactivity and reminders

Customer opening of offer details is recorded, and opening/replying/deciding preserves a
job-level activity timestamp. The follow-up command checks activity across ALL companies,
including existing modern and legacy customer chat messages. Company views do not count.
If no offer has been opened and no reply/decision recorded, send a reminder after seven
days from the first sent offer, and mark platform inactivity after fourteen days. Existing
jobs receive a tracking grace period starting with deployment of the new fields. Once
any customer activity exists, this rule does not treat later silence as global inactivity.

The marker does not close the job, prove absence of phone contact, or grant credit.
Opening/replying clears it. Customers see a follow-up prompt; companies see an explanation.
The reminder asks whether the work is still needed and links to the offers. Email failure
leaves the reminder unsent for retry. Push delivery is optional and follows preferences.

Run `python manage.py follow_up_inactive_requests` for a dry run.
Schedule `python manage.py follow_up_inactive_requests --apply` daily on the backend host
at deployment. The command is idempotent for successful sends/markers in ordinary runs.
No scheduler was installed and no real customer messages were sent during development.

## Agreements and collection

New subscription purchases (terms version 2026-09-20-monthly-v3) require reading server-generated terms, a representative name
and explicit acceptance of the current terms version. `SubscriptionAgreement` stores the
full text, company, account, name, timestamp and SHA-256. Signed copies remain readable
and downloadable on the company payments page after cancellation. Older signed copies
are never rewritten; historical subscriptions are not given fabricated signatures.
This is recorded consent, not document-based identity verification or a qualified signature.

Web payments use RaiAccept hosted checkout. Merchant credentials/account ID are required.
Callbacks verify stored order, transaction ID, merchant, amount, currency, environment,
type and success code. Order/transaction IDs are unique. Browser redirects are not proof
of payment. Unknown timeouts remain pending, rather than issuing another payment blindly.

AUTOMATIC MONTHLY CARD DEBITS ARE NOT IMPLEMENTED. The existing gateway uses hosted
checkout with recurring=None. Current terms accurately describe manual monthly payment
and require separate authorization before automatic card debits can be enabled. Obtain
RaiAccept's merchant-specific recurring API, enrollment/token lifecycle, idempotency/retry,
verification/cancellation documentation and merchant activation before implementing it.
Public feature information: https://www.raiaccept.com/en/home/features.html

Schedule `python manage.py prepare_billing_periods` daily to materialize monthly amounts
due, including notice months. These records are not VAT invoices. Automatic refunds,
collection reminders remain unimplemented. Orderless bank timeouts require support investigation. Native store
purchases remain disabled pending StoreKit/Play Billing; free/included entitlements work.

## Chat review and retention

Authorized staff with `offers.review_chat` can review stored messages in read-only admin;
access is recorded in ChatReviewAccess. Both chat UIs explain the support/review purpose.
Accepting an offer sets the job to in_progress and closes it to further offers, but does
not mark the work completed. The customer explicitly confirms completion through
POST /api/jobrequests/{id}/complete-work/ with confirm=true. This records completed_at,
sets completed status and writes an audit event; repeat submissions are idempotent.
Existing winner jobs are conservatively migrated to in_progress because the old completed
flag recorded acceptance, not actual completion. No historical completion date is invented.

Winning chats are protected while work is ongoing, even though the marketplace request is
inactive. They expire six calendar months after the later of the latest message and explicit
completion. Rejected/non-winning closed chats retain the existing six-month message rule.
An ongoing-case hold with a reason still prevents deletion. Schedule `python manage.py purge_expired_chats --apply` daily;
without --apply it is a dry run. Active/recent/held conversations are preserved. Legacy
conversations without corresponding Offer require separate review/migration. Backup
retention must be configured separately. No live deletion or scheduler setup was performed.

## Deployment

Deploy matching API, frontend and all pending migrations together. The hardening update adds
jobrequests.0012 and payments.0011 after the previous billing migrations. Verify migration backfill and PostgreSQL
locking in staging, configure email/push, grant support permissions, schedule the daily commands and the five-minute reconciliation
command above, and verify real bank sandbox checkouts/adjustments before live use.
The introductory dialog remains limited to balances 25–21, once per tab login session.
No production migrations, deployment or live financial transactions were performed.


## Outstanding subscription charges

The payments page lists all payable monthly charges separately from the latest contract,
including ended contracts and notice months. History provides subscription and period
references. An unstarted canceled contract is never collectible. Company-only ownership
checks still apply at checkout. Existing active subscriptions continue to use manual hosted
checkout; automatic debit is NOT implemented or enabled by this update.

## Launch verification and operations (2026-09-23)

The company dashboard now exposes server-computed free/credit/subscription balances,
next monthly amount/date, unpaid total and cancellation end date. A first period with
missing dates is repaired from its subscription anchor before quota calculation.

PostgreSQL-only concurrency tests and an isolated test settings module are included.
Render's two schedules are defined in deploy/render-billing.yaml and use the guarded
run_billing_maintenance command. No remote scheduler was activated. See
[the launch runbook](deploy/BILLING_RUNBOOK.md) for environment setup, test coverage,
manual activation and the bank requirements still blocking automatic monthly debit.
