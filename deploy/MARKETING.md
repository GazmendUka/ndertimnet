# Moderated company campaigns in Hero

Implementation on `codex/android-improvements-20261016`, based on `698fabf`.
Initial validation was local. Staging-only authorization and preparation are recorded below.

## Company workflow

Verified-email users with an active company can submit an image, title, description,
HTTP(S) destination, button text and requested duration (3, 7 or 14 days).
Submissions are persisted as pending and inactive. Companies can list only their own
campaigns, with pagination, and withdraw them. Content cannot be edited through the
company API after submission; corrections require a new campaign for review.
The dashboard has no fixtures, fabricated impressions/clicks or pricing promises.
Payments and analytics are not part of this release.

## Admin workflow

Open Django admin → Main → Reklama hero, filter `Shqyrtimi` to pending.
Inspect the image preview, content and destination. Select approved, rejected or paused.
A rejection requires a company-visible reason. Approval records reviewer/time and
activates the ad. Blank start/end dates are populated on approval from the requested
duration; admin can set a different publication window before saving. Resaving an
approved campaign does not reset its period. Withdrawal disables the ad immediately.

Only approved and active ads within their time window are exposed by either public
Hero API alias or the public detail aliases. Company/user deactivation also hides
company ads. Lowest display_order has priority; equally ranked eligible ads rotate
on page load. No guaranteed impression share or automatic timed slideshow is claimed.
Existing admin-authored ads remain supported and default to approved during migration.

The new frontend places a sponsored ad in the main Hero area, identifies it as an ad,
shows the sponsor and retains access to project creation. Without an eligible ad, or
if the API fails, the normal Hero remains. The API still returns one advertisement
using its existing response shape, with additive CTA/sponsor fields.

## Validation and storage

Images must decode as JPEG, PNG or WebP, be horizontal and at least 1200×600 px,
not exceed 5 MB or 20 megapixels. Recommended dimensions: 1920×900.
Titles: 5–180 characters; descriptions: 20–260; CTA: up to 40.
Company, approval and publication fields are controlled by the backend, never the
submission payload. Campaign images use the existing configured media storage.
Account erasure includes these images in the durable file-erasure queue.
Pending campaign metadata is private; media uses the existing media delivery URLs.
The separate staging storage adapter was exercised on 21 October as recorded below.

## Future release order (requires explicit authorization)

1. Verify current branch/remote and deployments again; preserve unrelated changes.
2. Confirm backup and existing production migration state.
3. Apply additive main migration 0007 and deploy backend before the frontend.
   No data rewrite or rollback of older migrations is required. The account-deletion
   worker must receive the updated deletion code as well; it historically uses
   autoDeploy=no and must be checked explicitly.
4. Test company submission, admin moderation, actual media storage and expiry in
   staging first. No production customers or unsolicited messages should be used.
5. Deploy frontend and build/sign a separately versioned Android update after approval.
   Installed apps contain bundled web assets and do not receive this UI via web deploy.
   Previous Play release was versionCode 2; verify latest Play state and choose a higher
   unused code. The local debug build retains source versionCode 1 and is not a release.
6. Verify the signed app on a physical Android device before releasing it to testers.

## Local validation

- 262 backend tests passed on isolated PostgreSQL, including 12 new marketing cases.
- 136 frontend tests passed across 21 suites, including submission failure/retry,
  pagination/withdrawal, and Hero/fallback coverage.
- Frontend production build and 16 prerendered SEO pages passed.
- Django system check and migration consistency passed. Migration was exercised by
  the isolated test database, not production.
- All external network connections were blocked during backend tests. Media tests
  used local files and fictitious users. The temporary PostgreSQL instance was stopped.
- Capacitor sync and Android assembleDebug passed locally (6 seconds). No APK was installed or distributed.
- Built company dashboard/form checked at 320, 390, 768 and 1440 px with synthetic intercepted APIs; no horizontal overflow observed. The form was visually inspected at 390 px. A full browser Hero scenario was not completed because the temporary browser harness stalled; Hero behavior is covered by component and backend tests. Physical-phone and staging-provider checks remain before release.


## Full local browser verification, 21 October 2026

Both company submission/moderation and direct creation of an admin-owned campaign
passed against real local Django/PostgreSQL and local media storage. No API mocks
were used. The previous incomplete browser Hero check is superseded by this run.
Nine workflow checks passed, including pending visibility, approval, pause, scheduled
start, expiry and company withdrawal. Both Hero variants were checked at
320/390/768/1440 px, with image decode, heading, CTA target, sponsor label, project
link and overflow assertions. Mobile and desktop screenshots were visually inspected.
No browser exceptions or server errors were recorded; saved image bytes and exactly
two campaign records were verified independently in the database. External traffic
was blocked; test services were stopped. Only test tooling/docs changed in this run.
Production, actual cloud storage delivery and a physical installed app were not tested.
Report and screenshots: this chat's outputs/marketing-tests-20261021.

## Staging and Android test preparation, 21 October 2026

The user explicitly authorized updating staging only for Marketing phone tests.
Production/main and Google Play must remain unchanged. Staging uses its own database
and Cloudinary cloud; email, push and billing jobs remain disabled. The staging CORS
allowlist includes the local Capacitor origins for the separate native test app.

The configured MediaCloudinaryStorage adapter successfully uploaded a unique synthetic
1920×960 PNG to staging, delivered the exact bytes over HTTPS, and deleted the object.
Cloudinary's resource API returned 404 after deletion; the CDN still served its cached
copy immediately after invalidation. This adapter check alone is not an end-to-end
test of the deployed Marketing API.

An isolated build workspace produces `com.ndertimnet.app.staging`, labelled Ndertimnet
TEST, versionCode 3 / versionName 1.2-marketing-test.20261021. It uses the staging API
with no production fallback, a visible Albanian test banner, no Firebase plugin/config,
and no production deep links. The normal app's sources, identity and configuration
are preserved. The APK can coexist with the Play app and is signed with the existing
upload key. The signature and 16 KB ZIP alignment were verified. Frontend production
build, 8 Marketing/Hero component tests, Android assembleRelease/lintRelease and 18
Marketing/staging backend tests, Django system/migration checks passed.

Artifacts and subsequent deployed-flow results belong in this chat's
outputs/android-marketing-staging-20261021. Do not upload this separate test package
to the production Play listing. Physical-phone validation is still required.

### Completed staging verification

Staging backend, frontend and account-erasure cron were verified live on `effbaf2`.
Migration main.0007 was applied only in staging. Main and both production web/backend
services remained at `698fabf`; no Play upload was performed. The cron deploy used
the verified staging branch because Render's API does not accept a commit ID for cron.

Nine real staging browser checks passed for submission, review, company/admin Hero,
pause, future start, expiry and withdrawal. Real Cloudinary images loaded for both
campaign types at 320/390/768/1440 px; CTA, sponsor, project link and overflow checks
passed. No browser exceptions/server errors were observed. Both cloud images' bytes
matched the synthetic originals. The exact signed APK was installed/cold-started in
a disposable Android 16 emulator; its approved staging Hero was visually confirmed.
The emulator was stopped. The logged-in native flow awaits physical-phone testing;
logged-in workflows were verified in the staging web browser.

Two fictitious accounts and two synthetic campaigns remain for the user's test:
company campaign 1 withdrawn, admin campaign 2 approved with a seven-day window.
Credentials are kept only in macOS Keychain, under Ndertimnet Marketing staging
20261021, and are not included in this repository or the delivery instructions.
The standalone storage lifecycle object was deleted; its CDN invalidation latency
was not measured. Final report, screenshots, APK and Swedish instructions are in
outputs/android-marketing-staging-20261021 for this chat.

### Internal Play build and staging update

The user authorized publishing an internal Google Play test against staging.
The original separate-package APK cannot update the existing Play listing.
A second isolated build therefore uses `com.ndertimnet.app`, versionCode 3 and
the same tested frontend assets, with the staging API only. Its local WebView
origin is `https://marketing-staging.localhost`, preserving separation from the
normal app's stored web sessions and drafts. Firebase and production deep links
remain excluded. It replaces the installed Play app for internal testers.

Staging backend, frontend and erasure cron were updated to `cc59023`, including
the explicit CORS allowance for this origin. Eighteen relevant backend tests,
system/migration checks, bundleRelease/assembleRelease/lintRelease, signatures,
bundletool validation and emulator cold start passed. The packaged app displayed
the approved staging Hero. Production/main remained `698fabf`.

The signed AAB and companion APK are in outputs/android-marketing-play-20261021.
At this record no Play upload or release had occurred: Chrome rejected Console
automation with Apple Events JavaScript disabled (error 12), including after the
user indicated the setting was enabled. No publisher API authorization or matching
connected publisher plugin was found. Verify Console access and that versionCode 3
is unused before upload. Preserve unrelated existing Console drafts/publication
changes. The user has authorized the internal release; further publishing approval
is unnecessary. Browser access is the remaining prerequisite.
