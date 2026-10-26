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
Full tier on frozen source 5e747f71: 522 passed, four failed, zero not run,
jobs 4, 1893.99 s. The ledger retains that result, not a claimed clean full
pass. All four failures were old fixtures inheriting the new production
defaults; fixes are listed below. Targeted reruns passed: drift trial (152
checks plus the explicit Pro recovery matrix), engine curve (15/15), map
view (529 checks) and helipad (108 checks). The first repair run exposed
missing DOM children in the last two fixtures; both passed after adding them.
No runtime code changed after the passing lane/build or during these repairs.
Passing suites and the build were not repeated (AGENTS rule 19).
Independent read-only review, including the final fixture repairs: clear.
Final board check: 191 checks passed; repository hygiene and diff whitespace passed.
Claude's written assertion approval and release checks remain with Claude.
Cockpit task T-062 maps this card; board sync set its status. The local
Cockpit build succeeded; existing Gmail/calendar feeds still report that
both Google profiles need interactive re-consent (unrelated to this card).

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

Full-tier findings required four fixture updates; their assertions are unchanged:

- test-drift-trial: pin tyre-slip false in the historical Duel helper and the
  two old App replay/recovery fixtures. The explicit new Pro fixture stays on.
- test-engine-curve: pin tyre-slip false only in releasedFingerprint, whose
  exact historical hash stays unchanged. Other engine checks keep current defaults.
- test-map-view: pin rescue false only in the map-off fixture, since rescue
  now enables Summit destinations independently of pilot-map. Map-on keeps
  rescue on and logbook remains on.
- test-drive-lesson-helipad: spell out the off matrix: both lesson switches
  false, only driving-lessons true, and only tyre-slip true. Previously the
  missing entries inherited dev/off defaults.
- The map and helipad DOM stubs now include the existing shelf, arrival and
  ski host sections needed by the released UI. Assertions stay unchanged.

## Removed

No runtime code or assets replaced. Remove stale dev/off descriptions only
for the released switches. Generated build, scratch and raw test evidence
files were recycled after recording their verdicts. No pictures required or
retained for this switch-only card. No player saves accessed. No frame timing.
