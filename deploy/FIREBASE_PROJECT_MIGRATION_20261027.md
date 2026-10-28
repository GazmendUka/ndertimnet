# Firebase project transition

The replacement project is `ndertimnet-production` (Ndertimnet Production), on
the free Spark plan, without Analytics or Gemini. Both native apps retain
`com.ndertimnet.app`. Authentication and application data remain in Django and
Render; no Firebase database or Firebase Authentication migration is involved.

## Server compatibility

Apply `pushnotifications.0002_notificationdevice_firebase_project_id` before
shipping the new native clients. Empty device project metadata belongs to the
original project. Registration accepts only the configured current and legacy
projects. Each sender uses a separate named Firebase Admin app and matching
credentials. A failure in one project does not interrupt the other. Sender
mismatches remain active for recovery; definitively unregistered tokens are
deactivated. Consent, account ownership and notification preferences still apply.

Production configuration:

- `FIREBASE_PROJECT_ID=ndertimnet-production`
- `FIREBASE_LEGACY_PROJECT_ID=ndertimnet-app`
- `FIREBASE_CREDENTIALS_JSON`: new project's protected server credential, supplied
  through Render environment configuration; never put its value in source/logs.
- Preserve the original `GOOGLE_APPLICATION_CREDENTIALS` and its secret file for
  installed clients that still use the original project.
- Preserve the existing push flag; staging push remains disabled.

Both projects must remain available during the installed-client transition.
Do not retire legacy credentials until legacy active devices and release uptake
have been assessed. Do not roll a migrated user base back to a legacy-only sender.

## Native builds

Use the new project's verified `google-services.json` and
`GoogleService-Info.plist` in their existing ignored native locations. Build with
`REACT_APP_FIREBASE_PROJECT_ID=ndertimnet-production`, and check the project and
sender IDs in both configuration files and final packages. Keep Analytics
disabled, the same signing identities and production API endpoint.

The app renews its token once when the configured project changes, after existing
OS permission is confirmed. The transition is saved only after authenticated
server registration succeeds. This does not request permission without a user
action or enable notifications for opted-out users. The website does not register
native notification devices and its appearance is unchanged.

The existing production APNs key is reused in the replacement project's
production Apple configuration. No replacement Apple key is required and no
development APNs key is added.

## Verification and rollout

Run Django checks, migration checks, relevant/full notification regression tests,
frontend tests and production builds. Stage the additive migration and server
compatibility first; then deploy the compatible production backend and configure
both senders before distributing the new test builds. Preserve unrelated Render
services, cron schedules, website deployments and existing store review submissions.

Provider validation uses `validate_only=true` and sends no notification. Firebase
accepting that request and APNs configuration does not prove receipt by a physical
phone. Confirm foreground/background delivery and notification navigation on both
Android and iPhone with the new test builds before declaring end-to-end success.

Keys are held in protected local storage and macOS Keychain, with server delivery
credentials only in Render configuration. No key, private account address, login
or device token belongs in this document or in git.
