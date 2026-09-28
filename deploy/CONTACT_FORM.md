# Contact form release checks

Deploy the frontend with `main/contact.py`, the new URL/settings, and
`core/email_backend.py` (including Reply-To support) and `main/contact_limits.py`.
Apply `main.0006_contactsubmissionguard` before enabling the endpoint. It adds one
new table, without changing existing customer data. Missing/unavailable quota storage
fails closed (503, no mail). PostgreSQL is required for cross-worker row locking.

- `CONTACT_RECIPIENT_EMAIL` defaults to `info@group-globale.com` on the server.
  Do not expose the recipient in contact page text, links, metadata or API responses.
  The privacy and account-deletion pages retain their existing contact details;
  this change does not remove the address from the entire website.
- `CONTACT_EMAIL_BACKEND` defaults to `core.email_backend.SendGridBackend`, separately
  from billing email configuration. Configure `SENDGRID_API_KEY` securely and use a
  verified `DEFAULT_FROM_EMAIL`. Never put a visitor's address in From.
- Tests override the transport with Django's in-memory backend or mock SendGrid.
  Do not use console/dummy/in-memory backends for live contact delivery.
- Provider acceptance is not proof of inbox delivery. Check SendGrid delivery/bounce
  events and perform an authorized end-to-end email test before launch.
- There is no automatic visitor email, no stored contact message, and no background retry.
  A timeout can mean an uncertain delivery; the frontend retains text without
  automatically sending a second message. Mail is stored in the support inbox.
- Outgoing attempts are reserved atomically in one PostgreSQL row before calling the
  provider, across all workers. Failed sends also consume quota. Rolling limits are
  five/hour per normalized email and global ceilings of five/minute, twenty/hour,
  and one hundred/day. No client IP or forwarded header is used for these quotas.
  Changing email addresses cannot bypass the global ceilings. Rejected attempts do
  not extend the window, and responses include Retry-After.
- The bounded row contains at most one hundred timestamps and keyed email hashes,
  never raw email addresses, IPs or message text. Entries older than 24 hours are
  removed on the next valid submission (idle storage is not automatically erased).
- These limits bound outbound mail; they do not prove visitors are human or prevent
  HTTP flooding. An attacker can consume the shared allowance and temporarily deny
  legitimate submissions. Edge protection/CAPTCHA is a separate defense; monitor
  429/503 rates and revisit conservative launch limits based on actual traffic.
- Local concurrency tests use PostgreSQL, including eight simultaneous connections
  racing to create the first quota row. SQLite cannot validate this guarantee.

## Release verification, 2026-09-28

- 178 backend tests passed on isolated PostgreSQL, including concurrent first-row
  creation and spoofed-forwarded-header regressions; all 30 frontend tests passed.
  Production build, Django system checks and migration consistency checks passed.
- Render's existing SendGrid credentials accepted sandbox validation. One authorized
  message was then sent with the release's actual email transport and Render sender
  configuration (reference ND-CONTACT-20260928-01). The owner confirmed receipt.
  This verifies transport delivery, not yet a submission through the deployed website.
- No email credentials, provider settings or paid services were changed.
- Deployment adds only the contact quota table. Roll back application code if needed;
  do not reverse the migration or remove the table automatically during rollback.
