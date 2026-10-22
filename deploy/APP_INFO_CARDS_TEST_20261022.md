# Compact native information cards: internal test update, 22 October 2026

The user authorized updating the existing internal Play and TestFlight test versions with the approved compact information cards. The website must retain its current appearance.

Only the native informational strip under Hero changes: four cards in two columns on phones,52px minimum card height,16px decorative icons and shorter Albanian text. The labels are Lehtë për klientë, Kërkesa reale, Shumë shërbime and Kosovë & Shqipëri. Text wraps without truncation on narrow displays. The original four-column layout resumes at1024px. Website text/classes and TrustItem compact=false remain unchanged. Hero, campaign example, header and authenticated navigation are preserved.

Local app commit:6648d48, not pushed. Android com.ndertimnet.app1.5(7) retains production API/Firebase/deep links. iPhone Ndertimnet TEST1.0(4) retains staging-only API, yellow banner, original capacitor://localhost scheme and disabled Firebase/notifications. Previous per-platform config files were compared with the new isolated build copies.

Checks passed:142frontend tests/22suites; Django system/migration checks with in-memory SQLite and external backend connections disabled; both frontend production builds without source maps and16SEO pages; native sync; Android bundle/APK/lint; iOS Release archive/manual signed export and simulator build. Signatures, app identifiers, versions, API isolation and the four approved labels were verified in the actual packages. Previous42browser checks apply to identical UI source and include mobile2x2 fit, no text clipping, Android/iOS branches and eight byte-identical website screenshots against the original release.

AAB SHA256:a1fb5a6040a702909d0a2cc4bddb6cb5e41a00f419737a95725d07eee59d2aee.
Companion APK SHA256:6fa1c3b950cafd3043e7a3a1bf1e2fe818d3c2afb25ec3916696017a58ecc125.
IPA SHA256:ebd5fe51c17ae660b07306f6563b9ab58fb2d3c78f8a5842464bdae8d0e1b897.

Native smoke tests passed: the signed companion APK installed/cold-started on a disposable Android16emulator; the matching simulator build launched on a disposable iPhone17ProMax/iOS26.5simulator. Screenshots were visually inspected: all four cards and full text are visible in two columns, with the correct Hero/navigation and staging campaign separation. Own instances stopped/deleted. Google internal release7 (1.5) is available for internal testers, released22October09:29 according to Console, verified again after full reload and reopening the release summary. The two non-blocking warnings match the previous release:missing deobfuscation/native debug symbols. Apple upload succeeded; processing VALID and IN_BETA_TESTING in the existing internal staging group were verified. Build4 ID:7668e9f4-daa1-4026-b481-329aa96e24a7. Albanian test notes saved, previous builds/tester membership preserved. Existing tester memberships and prior builds preserved. No public store release.

Read-only live checks returned200 for the website and production/staging health. The website still uses main.e984edf3.js. No code push, server deployment, migrations or customer-data writes.

Local outputs/info-cards-release-20261022 contains packages, validation reports, logs and LAS-MIG.txt. Temporary Apple signing keychain/private files were removed after final verification. Other keychains and existing secure backups were preserved.

Android tester link:https://play.google.com/apps/internaltest/4699659099498966954 then Update; use production app accounts. iPhone:open TestFlight and update Ndertimnet TEST; use separate staging accounts. Physical phone and authenticated native checks remain user acceptance tests.
