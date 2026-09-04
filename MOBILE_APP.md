# Ndërtimnet Android and iOS apps

The mobile apps use the same React product and Django API as the website. The
React build is bundled inside native Capacitor projects so the customer and
company experiences stay aligned across web, Android, and iOS.

## App identity

- Name: `Ndërtimnet`
- Bundle/application id: `com.ndertimnet.app`
- Production API: `https://ndertimnet-r5dt.onrender.com/api/`

Confirm the bundle id in Apple Developer and Google Play Console before the
first store release. Changing it after release creates a different app.

## Build prerequisites

- Node.js 22 or newer
- Android Studio with the Android SDK and a supported JDK
- Xcode on macOS, plus an Apple Developer team for device/store signing
- Google Play Console and Apple App Store Connect organization accounts

## Local workflow

From `frontend/`:

```sh
npm install
npm run mobile:sync
npm run mobile:android
npm run mobile:ios
```

`mobile:sync` creates the production React bundle and copies it, plugins, and
configuration into both native projects.

## Links and payment return

The app handles `https://ndertimnet.com/...`, `https://www.ndertimnet.com/...`,
and `ndertimnet://...` links. Before store release, publish and verify:

- Apple Associated Domains and an `apple-app-site-association` file containing
  the real Apple Team ID and final bundle id.
- Android App Links and an `assetlinks.json` file containing the SHA-256
  fingerprint of the final Play signing certificate.

RaiAccept checkout opens in a protected system browser. Closing checkout
returns the user to the relevant lead or accepted offer and refreshes its
payment state. The backend is the source of truth: a payment is only confirmed
after a server-to-server transaction verification, never from the browser
return URL. The verified transaction id, merchant, environment, amount,
currency and success code must match the locally stored payment.

There are two materially different payment categories:

- Payment for construction or another physical service delivered outside the
  app may use RaiAccept card checkout, Apple Pay or Google Pay.
- Payment to unlock a lead is payment for app functionality. Paid lead unlocks
  are therefore blocked in the native iOS and Android clients until Apple
  In-App Purchase and Google Play Billing, or a written applicable exception,
  has been implemented. Free lead unlocks continue to work in every client.

RaiAccept advertises Apple Pay and Google Pay through its hosted checkout, but
the payment methods must be enabled for the merchant account. Production must
not be enabled until the bank has supplied and approved the final merchant
credentials, return URLs and notification URL.

Customer payment for an accepted construction offer is protected by
`CUSTOMER_JOB_PAYMENTS_ENABLED`, which defaults to `False`. It currently
supports accepted, signed, fixed-price offers in EUR. Hourly offers require a
separately agreed final amount before a payment can be created. Set the flag to
`True` only after the acquiring, settlement, refund and merchant-of-record
arrangements are approved and the full sandbox journey has passed.

## Push notifications

The application code supports opt-in push notifications for new chat messages,
new or decided offers, and confirmed customer job payments. Notification text
is intentionally generic and does not expose chat content on a locked screen.
Tokens are created only after the user enables notifications, are removed on
logout or opt-out, and are never returned by the backend API.

Before real-device notification tests:

1. Create an organization-owned Firebase project.
2. Register Android app `com.ndertimnet.app`, download `google-services.json`,
   and place it at `frontend/android/app/google-services.json`. Do not commit
   this file unless the team has explicitly approved its repository handling.
3. Register iOS app `com.ndertimnet.app`, download `GoogleService-Info.plist`,
   and add it to the App target in Xcode.
4. In Apple Developer, enable Push Notifications for the App ID, add the Push
   Notifications capability to the Xcode target, create an APNs authentication
   key, and upload that key to Firebase with its Key ID and Apple Team ID.
5. Give the backend Firebase Application Default Credentials through a secure,
   externally mounted service-account file. Set `FIREBASE_PROJECT_ID` and
   `GOOGLE_APPLICATION_CREDENTIALS`; keep the credential file outside source
   control.
6. Apply Django migrations, then set `PUSH_NOTIFICATIONS_ENABLED=True` only in
   the intended test environment.
7. Test opt-in, opt-out, logout, foreground, background, terminated-app taps,
   token refresh, chat, offer decisions and payment confirmation on physical
   Android and iPhone devices using non-production test accounts.

The backend flag defaults to `False`. The Android and iOS Firebase app
configuration files are installed locally and intentionally ignored by Git.
The Firebase Admin credential is stored outside the repository with user-only
file permissions.
Real push delivery still remains disabled until backend credentials and, for
iOS, the Apple APNs authentication key have been configured and tested.

## Release checklist

1. Install Xcode and Android Studio/JDK.
2. Confirm organization-owned developer accounts and bundle id.
3. Create separate customer and company reviewer accounts with sample data.
4. Add final icons, launch screens, privacy policy, support URL, store text,
   screenshots, age rating, and data-safety/privacy disclosures.
5. Configure and verify universal/app links with the final signing identities.
6. Test registration, email verification, password reset, every profile step,
   job creation/editing, moderation states, lead unlock, offers, chat, reviews,
   push opt-in/out, image/PDF uploads, account deletion, and payment return on
   real devices.
7. Upload an internal Android build and an iOS TestFlight build before review.
