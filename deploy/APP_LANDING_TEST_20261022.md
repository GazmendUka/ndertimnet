# Native Ballina test update, 22 October 2026

The user authorized updating the existing Google Play internal and TestFlight versions with the approved app proposal while keeping the website unchanged. No source push or server deployment is part of this update.

## App behavior

- Compact native header and shorter Albanian welcome text.
- Campaign image and welcome text occupy separate areas; the whole campaign image is visible.
- No default image or reserved campaign area without an active campaign. A discreet button opens a clearly marked illustrative campaign example.
- The guest navigation center opens Kyçu directly. Authenticated customer/company navigation reuses the existing component unchanged.
- The website retains its original Hero, header and navigation. Native behavior is selected through Capacitor.isNativePlatform().

## Build scope

App source commit: 68123967136f36c68766eae4fe48dfbc8375f78a (local only).

Android: com.ndertimnet.app, 1.3 (5), production API, existing Firebase/signing/deep links, Google Play internal track only. Accepted and published; availability persisted after a full Console reload. Console release time: 22 October 07:39. The two non-blocking warnings concern absent deobfuscation/native debug symbols. Existing testers unchanged.

iPhone: com.ndertimnet.app, Ndertimnet TEST, 1.0 (2), staging API, yellow test banner, notifications/Firebase disabled, previous staging configuration preserved. Existing Apple signing identity/profile/API key reused. Apple validation and upload succeeded; processing is VALID and build 2 is assigned to the existing internal staging TestFlight group. Internal build state IN_BETA_TESTING was confirmed. Build ID: 9e1a6b54-5de9-44ba-a39b-b137303bd138. Test release notes were saved; prior build and tester membership were retained. The temporary signing keychain and private files were removed while preserving other keychains.

Android AAB SHA256: 1939957a0a67707cee1521afb66e84639018ab1c5197f890f7ea60f00ec6e782.

Android companion APK SHA256: f5444dc8753eeeea187630d1b660ebf536597b15f223831f25b5f262901948a2.

Signed IPA SHA256: 8cfc51775a52bd21a34f7675a98d093538fda1570b1d2d9f432a83b352eadb1b.

## Validation

142 frontend tests in 22 suites passed. Django system and migration checks passed with in-memory SQLite and external backend traffic blocked. No backend code or migrations changed. Production frontend builds (16 SEO pages), native synchronization, Android release bundle/APK/lint, iOS Release archive/export and simulator build passed. Package signatures, identifiers, versions, expected environment and the absence of cross-environment endpoints were checked.

Previous browser checks: 27 cases passed; eight website screenshots exactly match the original release, and fourteen app references remain visually unchanged after the website proposal was reverted. Native smoke tests installed and started the signed companion APK on a disposable Android 16 emulator and the matching iOS simulator build on a disposable iPhone 17 Pro/iOS 26.5 simulator. Screenshots visually confirm the approved landing layout, guest Kyçu button, Android no-campaign state and iOS staging campaign without text overlay. Own emulator/simulator instances were stopped/removed. Physical phones and authenticated native flows remain user acceptance tests.

Read-only live checks: website 200 with unchanged main.e984edf3.js; production and staging health 200. No new campaign/customer data was written. No public release, website/server deployment, Git push, migration, email or tester invitation was performed.

## Tester instructions

Android: https://play.google.com/apps/internaltest/4699659099498966954 using the existing tester account, then Update in Google Play. Use production accounts.

iPhone: open TestFlight and update Ndertimnet TEST once 1.0 (2) is available. Use separate staging accounts.

Release artifacts and detailed verification are local in outputs/landing-release-20261022 under the existing Codex workspace. Signing secrets are never included in this document or the deliverables.
