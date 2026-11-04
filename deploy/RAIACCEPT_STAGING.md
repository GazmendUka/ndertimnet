# RaiAccept sandbox in staging

Staging bank access is disabled by default. After this code is released to the
staging backend, configure only that service with:

- STAGING_RAIACCEPT_ENABLED=true
- RAIACCEPT_MODE=sandbox
- RAIACCEPT_SANDBOX_USERNAME and RAIACCEPT_SANDBOX_PASSWORD from the sandbox portal
- RAIACCEPT_MERCHANT_ACCOUNT_ID from the sandbox account

Store credentials only in protected server environment settings. Do not paste
values into source, logs or chat. Production mode and production credentials
remain forbidden, even with opt-in. Missing/blank sandbox fields fail startup;
credentials without opt-in also fail startup. Email, push, scheduled billing and
media protections are unchanged. This opt-in permits API access; it does not
prove bank compatibility or verify the supplied account's environment.

Run bank acceptance against synthetic staging accounts using bank-issued test
cards. Verify success, decline, cancellation, duplicate notifications and pending
outcomes before any production activation. No real card payments are needed.
