# Account confirmation in the isolated iPhone test environment

Company registration previously created a staging user and then failed while
trying to send through SendGrid, which staging correctly forbids configuring.
The registration response could therefore fail after the user was already saved.

Staging now skips verification/welcome delivery. A new account remains unverified
until the user signs in with their chosen password and explicitly confirms their
own account in the test app. No email-ownership verification is claimed by this
test flow. It must not be used with production/customer data.

`accounts/test/confirm-account/` requires authentication and both the exact
`ndertimnet.staging_settings` module and its hard-coded
`STAGING_ACCOUNT_CONFIRMATION_ENABLED=True`. Those settings already require the
designated staging database and block production delivery credentials. Copying a
flag into ordinary production settings cannot enable confirmation. The request
body cannot choose another user. Disabled/deleting accounts stay blocked.
Confirmation sets only the signed-in user's email confirmation fields; it never
approves a company, creates a payment, grants offers or reactivates an account.

New iPhone Sandbox build 1.12 (12) explains test accounts on login, stops promising
undeliverable reset emails and routes unverified test users to confirmation.
Both new registrations and accounts left by the previous failure can sign in
and complete the same confirmation. The ordinary client retains email
verification. No database migration or production deployment is required.

Validation: 366 backend tests, nine focused registration/security tests, 227
frontend tests, Django checks and migration consistency, ordinary production
frontend build and the separate iPhone Sandbox build. Physical Apple purchases
still require testing on an iPhone; test confirmation is not purchase evidence.

Deploy only to the existing staging backend/worker and distribute via the
existing internal staging TestFlight group. Do not submit to App Review or enable
production sales as part of this fix. Keep Apple/RaiAccept Sandbox settings and
the Android test flows unchanged. Rollback code to previous staging commit
49fdc5708bf75ad83e0f79343d9622d0b8c0766b if necessary; no schema rollback applies.
