# Simpler native Hero: internal test update, 22 October 2026

The user approved distributing the latest app proposal through the existing internal Google Play and TestFlight groups while retaining the website.

The native Hero now uses Gjeni profesionistin e duhur., a full-width Fillo projektin këtu button and the discreet A jeni kompani? campaign-example trigger when there is no active campaign. The previous location row, explanatory paragraph and secondary company-registration link are removed from this area. Campaign rendering and dialog behavior, the header, logged-in navigation and website remain unchanged.

App source: local commit 193b206, not pushed. Android 1.4 (6) uses the existing production API, Firebase and deep links. iPhone Ndertimnet TEST 1.0 (3) retains the existing staging API, banner, local scheme and disabled Firebase/notifications. No server deployment or database migration.

Validation: 142 frontend tests/22 suites, Django system/migration checks with in-memory SQLite and external backend connections disabled, both production frontend builds/16 SEO pages, native synchronization, Android bundle/APK/lint and iOS archive/export/simulator builds passed. Previous 34 browser checks cover the same approved UI and include eight byte-identical website comparisons against the original release. Package signatures, identifiers, versions and expected API isolation were checked. The first native builds included source maps; these were rebuilt without source maps before upload. Verification handles JavaScript-escaped Albanian characters and checks the exact retained iOS local server scheme.

Native smoke tests: the signed companion APK installed and cold-started on a disposable Android 16 emulator; the matching iPhone build launched on a disposable iPhone 17 Pro/iOS 26.5 simulator. Screenshots were visually inspected. Correct compact Hero and Albanian text, production no-campaign state, staging separate full campaign image and existing guest Kyçu navigation were visible. Own instances were stopped/deleted. Physical phone testing and authenticated native flows remain user acceptance checks.

AAB SHA256: 7c52b4760cf27c340144f68eb2c8b52f7f8fac4961f82afb0db5d57e716dbdb0.

Companion APK SHA256: 538cfc34b8845c16b1a0a59386948f963957247b0a091684c7e02b42a7e3b389.

IPA SHA256: 01b926fb4371bcd4cc55e42b40531230ead5c70cef18331700c9956c8d07b170.

Distribution completed: Google Play 1.4 (6) is available for internal testers, released22October08:17 according to Console, confirmed again after full reload. The only warnings are absent deobfuscation/native debug symbols, matching the prior release. Apple1.0(3), build ID e3dbd0a9-babd-4722-9acd-edc72348e19f, is VALID and IN_BETA_TESTING in the existing internal staging group46c12e59-3c53-4610-abad-3051fed5129d. Albanian test notes saved, prior builds/testers preserved; no public release or invitations.

Read-only live checks: website and both backend health endpoints returned200, website script remains main.e984edf3.js. No code push, server deployment, production migration or customer-data write. Local delivery outputs/landing-refinement-release-20261022 contains packages, logs, native images, validation reports and LAS-MIG.txt. Temporary Apple signing keychain and private files were removed after final API verification; other keychains and existing secure backups were preserved.

Tester access: Android https://play.google.com/apps/internaltest/4699659099498966954 then Update; iPhone open TestFlight and Update Ndertimnet TEST. Android uses production accounts; iPhone uses separate staging accounts.
