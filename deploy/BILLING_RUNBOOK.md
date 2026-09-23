# Billing launch and operations

## Verified locally, 2026-09-23

Use `ndertimnet.test_billing_settings` and `BILLING_TEST_DATABASE_URL` pointing to a
**dedicated PostgreSQL database named ndertimnet_test***. This settings module deliberately
ignores DATABASE_URL for its connection, clears bank credentials and captures Django mail
in memory. Never use a production copy or customer records for these tests.

```
python manage.py test payments offers jobrequests main.test_user_journeys \
  --settings=ndertimnet.test_billing_settings --noinput
```

`payments.test_launch` covers publication through customer draft submission and moderation,
free sending, paid sending, contact access, acceptance, paid price amendment, acceptance of
the amendment and explicit work completion. Bank responses are mocked. PostgreSQL threads
cover competition for the last slot, double checkout, simultaneous consumption of one free
offer and duplicate bank callbacks. SQLite skips the concurrency cases; it is not sufficient.

The web dashboard was also tested in desktop/mobile Chrome against the actual local API
and fictitious data, with all non-local browser traffic blocked. This is not a real bank test.

## Before creating the Render jobs

Deploy the matching API/frontend and apply all pending migrations to the chosen environment.
Keep staging and production databases, bank credentials and environment groups separate.
Render access was connected on 2026-09-23. Production services are in `My Workspace`;
the workspace named `ndertimnet` is empty. See `RELEASE_2026_09_23.md` for the
deployment record and rollback procedure.

Create an environment group named `ndertimnet-billing-runtime` in Render, copied from the
matching backend's settings, including:

- `DATABASE_URL`: the same PostgreSQL database as that backend (never a different environment).
- `SECRET_KEY`, `ENVIRONMENT=production`, `DEBUG=false`, `ALLOWED_HOSTS`.
- `FRONTEND_BASE_URL`, `BACKEND_BASE_URL`, `DEFAULT_FROM_EMAIL`.
- `RAIACCEPT_MODE`, `RAIACCEPT_MERCHANT_ACCOUNT_ID`, and the credentials for that mode.
- `SENDGRID_API_KEY` and `EMAIL_BACKEND=core.email_backend.SendGridBackend` for reminders.
- The backend's push notification settings if push is enabled.
- `BILLING_JOBS_ENABLED=true` only after migrations and environment checks are complete.

Import `deploy/render-billing.yaml` as a Blueprint from the same repository/revision as the
backend. It defines two jobs: reconciliation every five minutes and daily maintenance at
03:15 UTC. Daily maintenance creates periods, sends inactivity reminders and purges eligible
closed chats, in that order. PostgreSQL advisory locks prevent overlapping instances of the
same job. The wrapper defaults to a dry run; `--apply` is required for effects.

Before enabling the schedule, run:

```
python manage.py run_billing_maintenance reconcile
python manage.py run_billing_maintenance daily
```

Then verify an applied run in staging with fictitious users and SendGrid test recipients.
Check Render's run history for exit status and logs. Bank calls never create a charge during
reconciliation. Failed verification retains the reservation for manual investigation.

Render cron jobs are billed services. The published schedule uses UTC, not Swedish local
time; 03:15 UTC is 04:15 or 05:15 in Sweden. Review the resource settings before importing.
Sources: https://render.com/docs/cronjobs and https://render.com/docs/blueprint-spec

## Real bank sandbox acceptance

Using merchant-provided sandbox credentials and test card details, confirm hosted checkout,
success, decline, cancel, a missed notification recovered by reconciliation, repeated
notifications and a price adjustment. Compare order/transaction IDs, amount and currency
with the RaiAccept portal. Use only test cards supplied by the bank. No such sandbox
credentials or merchant confirmation have been provided here, so these checks remain open.

## Recurring debit remains blocked

The current payment method is manual monthly hosted checkout. It must remain described
that way. Stored cards or one-click checkout alone do not establish support for unattended
monthly collection. Before implementing automatic debit, RaiAccept must provide:

1. Confirmation that recurring merchant-initiated collection is enabled for this merchant.
2. Enrollment/mandate and token creation documentation, including initial authentication.
3. Exact subsequent-charge endpoint, fields, idempotency and duplicate detection behavior.
4. Status lookup, notification verification, cancellation and token revocation rules.
5. Rules for retries, declined cards, required customer authentication and test cases.

Do not store raw card numbers or invent an endpoint from another bank's API. Existing
signed subscription contracts remain unchanged; an automatic debit mandate requires
separate customer authorization. Do not claim automatic collection is available until
bank sandbox tests and activation have succeeded.
