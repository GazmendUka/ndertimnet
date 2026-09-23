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

The current model charges for platform services: publishing a job request,
sending a company offer, or a monthly company subscription. See `BILLING.md`.
Preparing a draft is free but reveals no customer contacts or chat. Each company has
25 free sent offers, usable on web and native; quota is consumed atomically when signing.
After these, a subscription allowance or individual payment is required. Chat and direct contacts open when the paid/included offer is sent.
Phone/email sharing is allowed after sending. Accepted agreements stay separate from
proposed changes; customers approve the exact signed version. Individually paid
price increases require only the outstanding fee difference before resending. The former 25-free-leads and 4.95 EUR unlock model
is retired. Payments for the actual construction work are no longer offered.

Native iOS/Android clients do not open external checkout for these purchases.
Free introductory publications and existing paid subscription entitlements
remain usable. Native purchase flows still require StoreKit/Play Billing setup
and applicable store review; no store products or receipt validation are
implemented by this change. Web checkout uses the existing RaiAccept adapter.

Production requires approved merchant credentials, a merchant account ID,
return URLs and the new `/api/billing/notify/` callback. The legacy callback is
retained only to settle historical transactions. Monthly subscriptions currently
use one hosted payment per month; they do not auto-debit saved cards.

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

Price increases below EUR 100 cumulatively from the last billed price incur no extra fee.
At EUR 100 or more only the unpaid fee difference applies. See BILLING.md for credits,
version decisions and platform inactivity. These rules are enforced on the server.
