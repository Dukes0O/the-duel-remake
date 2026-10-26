# GO-LIVE-EVENING

## Decision before code

Follow Claude's card: release driving-lessons, heli-logbook, heli-skiing and
rescue together. Also release tyre-slip: App._drivingLessonsEnabled and the
Duel lesson admission require both switches. No other switch needs changing.
In particular, logbook rank paints work with heli-skins off through
wearLogbookPaint and heli-scene's view.logbook.paint path. Keep heli-skins dev.
Lab 2, helicopter, forest fire and Summit Run are already on.

## Checks

Feature-switch checks prove production admission and explicit off overrides;
ski physics checks pin the released ski switch. Keep all behaviour limits.
Run the lane tier (--changed --jobs 4), the full tier (--jobs 4 --keep-going)
and the production build, checking the integration inbox and heavy-job count
before each. No frame timing. Pictures are not required by this switch-only
card. Claude reviews the assertion changes and handles merge and release.

Lane tier: 35 passed, zero failed or not run, jobs 4, 229.53 s. Production
build passed (558 modules); existing chunk-size and mixed-import warnings.
Replay guard: 225 checks across 25 cases; combat replay: 12 checks across
four encounters; world composition: 47 checks. Fingerprints unchanged.
Independent read-only reviewer: clear, no faults. Full tier pending on the
frozen source. Claude's written assertion approval remains a merge step.

## Changed assertions

- tools/test-feature-flags.mjs catalog assertion: driving-lessons, tyre-slip,
  heli-logbook, heli-skiing and rescue were required to equal dev; now each
  must equal on. All other catalog states and the count stay exact.
- The same suite's RELEASED_FLAGS production and URL assertions now include
  those five switches. Its four dev-isolation assertions per switch still
  require off in production, off for production URLs, off in unnamed QA,
  and on only for a named QA request, using an explicitly dev-pinned catalog.
- Added one explicit false-override assertion for each of the five switches.
- tools/test-ski-physics.mjs: heli-skiing state dev -> on. No physics, score,
  timing, replay, count or tolerance assertions changed.

Existing off paths remain in test-heli-logbook-session (logbookEnabled:false),
test-heli-rescue-session (rescueEnabled:false), ski session admission tests
and the driving lesson/tyre-slip tests. These exercise explicit disabled
inputs independently of the production catalog.

## Removed

No runtime code or assets replaced. Remove stale dev/off descriptions only
for the released switches. No player saves accessed.
