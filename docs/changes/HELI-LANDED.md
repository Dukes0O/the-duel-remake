# HELI-LANDED

Live fix; switch: `helicopter` (on).

Design: follow Claude's card. Show a separate arrival box on the ground inside
the existing landing circle, at or below `CABLE.setDownSpeed`. Hide it during
lessons, challenges, jobs, active rescues, fires and ski flights/runs. Use the
existing dispatch for local jobs and the session's own parked car. Race here
returns to the menu with the course and parked car selected; Shut down uses
the existing menu exit, which stores the remaining fuel. No automatic action.
The pause footer reads the existing helicopter controls help.

Checks: arrival visibility and menu actions in `test-heli-view`; memory-only
browser picture at Tremblant Snow; lane tier (jobs 4), production build.
No frame timing.

Review: independent reviewer confirmed both fixes after finding two edge cases:
locked courses now disable Race here with an unlock explanation (the existing
menu cannot select a locked course); hooked/airborne cars are excluded from
saved parked locations. No remaining findings.

Changed assertions: none. Added coverage for arrival visibility, local dispatch,
parked cars, both menu exits, fuel, locked courses and the pause footer.
Targeted suite: `node tools/test-heli-view.mjs` passed, 270 checks.
Race rules and simulation files are unchanged; replay/world guards run in the
lane tier below.

Gate: `node tools/run-tests.mjs --tier lane --changed --jobs 4` passed
64/64 suites, 0 failed, 0 not run (355.63 s), with System32 first on PATH.
Replay fingerprints: 225 checks across 25 cases, unchanged. World composition:
47 exact checks passed. `npm run build` passed (1.45 s); existing chunk-size
and mixed static/dynamic import warnings only.

The first lane attempt found a missing optional arrival host in an existing
fake DOM. The update now guards that host like the ski panel; the unchanged
helipad suite passed all 108 checks and independent review confirmed the fix.
The corrected full lane result above covers it. No assertion was loosened.
Cockpit sync completed: 0 tasks changed.

Browser: native session at Tremblant Snow, memory-only QA page, private port
58418. Both buttons reached with Tab and activated with Enter; Race here
selected Tremblant Snow and the parked Falcone F42, and Shut down kept fuel.
Passed with 0 errors and 0 warnings. The first capture's Enter event lacked
carriage-return text; corrected to the existing scenario convention, then
passed. No game code or test assertions changed for that tool correction.
Picture: `.evidence/2026-10-26/HELI-LANDED/tremblant-snow-landed.png`.
Capture recipe: trained memory-only profile with fuel 123.4 kg, Snow unlocked,
Falcone F42 parked at Snow; visit with another car, start the native session
at Snow, wait for the real scene and arrival panel, capture at 1280 by 720.
No frames measured; live game and real saves untouched.

## Removed

Nothing.

## Claude review (26 October 2026)

Approved and merged: the picture at Tremblant Snow shows the panel, the parked car and both buttons. No assertion changed. Live with the next release.
