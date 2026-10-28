# DEEP-PLAYTEST-1

## Design before code

Kyle chose small, floaty hops. The shared jump step carries the ground's
uncapped rise per second over a crest, and one-third gravity prolongs that
launch. Limit upward seabed speed to 2.4 m/s and height to 1.5 m only in the
enabled underwater journey. Keep descent, ascent, gravity and landing intact.

Draw a north-up dive map at the race map's lower-left position: authored loop,
discovered place labels, ramp and car heading. After 60 seconds show a bearing
and distance back to the ramp; a Return bearing button requests it sooner.
M already mutes in races, so use a Show/Hide map button. All map choices are
local view state, reset each visit. Read discovery through the existing getter.

Checks: worst real kelp bump at full speed and map data/read-only tests;
lane tier (jobs 4), build, deep-sirena and deep-life (jobs 1), then deep-frames
alone, timing-only, headed, jobs 1. Save one map JPG for Claude's look check.

## Assertions and review

No numeric assertions or fingerprints changed. Added the worst-bump test on
all three routes and a map-data test (geometry, discovery filtering, car
heading, return bearing, delay/request and unchanged input packets).
The story HUD test only gained canvas/event methods and an empty state in its
mock; all its assertions stay exact. Independent code review: clear.

Changed guard inventory: `test-deep-look.mjs` now allows only the map test's
two exact Deep imports and `screen-results.js|./deep/deep-hints.js`, the released
2d0e281e dive-kit notice missing from its allow-list. The empty-unapproved-import
assertion remains intact. Claude's written review of these entries is pending
before merge; this lane does not merge or push.

## Checks

Build passed (532 modules; existing chunk warnings). `deep-sirena` and
`deep-life` passed, no browser warnings/errors. Map picture: inspected native
1280×720 Drop-off capture, retained as `docs/board/looks/deep-playtest-1/round-1.jpg`
(71,404 bytes); Claude's look verdict remains pending.

Initial lane: 11 suites passed, unchanged sea-life CPU timing failed at
4.287 ms/frame while other workers ran, 16 suites not run. Its one isolated
rerun passed all 23 checks at 1.751 ms/frame. Follow-up: QA-DEEP-LIFE-TIMING.
All 16 previously unrun lane suites then passed. The import guard needed the
exact inventory additions above; picture placement passed after renaming
`map.jpg` to `round-1.jpg`. Combined lane coverage: all 28 selected suites
passed, no suite left unrun. The continuation also passed the board and two
extra matching suites. Passing suites were not repeated. Core: 632 checks;
race integrity: 605; replays: 225 checks over 25 cases, all fingerprints exact;
world composition: 47 exact-scene checks. Focused sea-floor tests: all four
passed, including one-third gravity, harmless landing and switch-off identity.

Cockpit linked DEEP-PLAYTEST-1 to T-043 and QA-DEEP-LIFE-TIMING to T-044;
protected sync succeeded. The unrelated SAVE-RECORDS-IDB mapping remains
with that card's owner.

`deep-frames`: NOT RUN, no p95 claimed. Heavy test/build/browser jobs drained,
but the existing Chrome GPU process (20728, parent 23076, normal Chrome started
23 October, window titled The Duel) used 79–93% of the GPU across checks.
AGENTS rule 8 requires waiting, so no invalid measurement was started and no
live game was paused, refreshed or closed. Kyle was asked to make the GPU
quiet. Required remaining command, alone with the laptop panel already off:
`node tools/run-browser-scenarios.mjs --scenarios deep-frames --timing-only --headed --jobs 1`.
Acceptance remains incomplete until both qualities pass at p95 <=18.5 ms.
No release, merge or push. Claude's picture and import-inventory reviews also
remain for handoff.

## Removed

Replaced the underwater journey's unbounded bump launch; no assets removed.

## Claude review (25 October 2026)

Map look passed (loop, places, ramp, car arrow, return bearing). Import-guard additions approved: the map test's two Deep imports and `screen-results.js|./deep/deep-hints.js`, which Claude's released dive-kit notice needed. deep-frames waits for a quiet laptop before the next release.
