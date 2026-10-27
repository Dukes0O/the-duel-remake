# HELI-SUMMIT-LANDED

## Decision

Use the existing start landing circle and Summit's authored ski landing pads,
with their existing radius and the existing set-down speed. A settled rescue
or ski arrival explains the work waiting and offers Shut down. Race here stays
disabled while that work is in hand. Lessons, challenges, cargo jobs, fires,
ski runs and surveys keep their existing panel rules. No flight rules change.

Checks: arrival visibility at all five destinations and Summit's marked pads;
busy arrival actions and fuel retention in the existing heli-view suite;
native Summit reproduction and panel picture; lane tier and production build.
No frame timing.

## Reproduction

Native Chrome, private port 5297, isolated memory-only Preview storage and
today's live switches. The real session flew from Tremblant Woods to Summit
and descended from the arrival hover onto the start circle (30, 0), ground
height 14.657 m. The existing ski scenario's scripted pilot then flew a fresh
400 kg Summit session uphill and set down at the marked summit pad:
(3104.899877, 6904.000494), onGround true, speed below 0.000001 m/s,
ski.pad summit, no lesson, challenge, job, rescue, fire, ski flight/run or survey.

Cause: `atAnyPad(view)` returned false. It only accepts `view.zone`, the
12 m start circle, 7557.793 m away. Original `landedArrival` returned null
and original `arrivalMarkup` returned an empty string. The ski-flight and
active-rescue exclusions would also hide the panel while those jobs waited.

The fixed production UI was remounted over that preserved real landed session
after development hot reload disposed the original screen. The requested
native panel capture is in integration:
`.evidence/2026-10-27/HELI-SUMMIT-LANDED/summit-panel.png`.
Visually checked: Summit title, crate board, enabled Race here and Shut down.

## Changed assertions

The existing hidden-panel loop no longer expects an empty panel for
`rescue.active` or `ski.flight`. Explicit waiting text, enabled shutdown and
disabled racing assertions replace those two expectations, at all five
destinations. Existing airborne, outside-zone, moving and other busy-state
assertions remain. Added all three authored Summit pads, airborne/outside-pad
cases, real Summit race/shutdown selection and fuel checks, and real ski-drop
action rejection plus shutdown/fuel retention. No tolerances, fingerprints or
simulation assertions changed. Claude's written review of these deliberate
expectation changes is still needed before integration (AGENTS rule 18).

## Checks

- New acceptance case first failed on the original hidden rescue panel.
- `node tools/test-heli-view.mjs`: 345 checks passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 42 passed,
  0 failed, 0 not run, 243.12 s. Replay fingerprints and world signatures pass
  unchanged. PowerShell, System32 first on PATH. Heavy count 0 before start,
  1 at the follow-up check; native QA occupied one additional slot.
- `npm run build`: passed, 594 modules, 937 ms. Heavy count 0 before start;
  completed before the one-minute recheck. Existing chunk-size and mixed
  dynamic/static import warnings only.
- Independent read-only code review: clear, no defects found.
- Session-end status refreshed; board check passed (202 checks).
  Cockpit sync dry run: no task statuses would change; this new card has no
  Cockpit task yet (Director follow-up with integration's board/task mapping).
- Native reproduction and panel picture as above. No frame timing, real saves,
  live checkout writes, merge or push.

## Removed

Replaced the start-circle-only arrival gate and the silent rescue/ski-flight
exclusions. No obsolete alternate UI retained. Recycled this task's scratch
driver, flight script, temporary browser profile and generated build output;
kept only the requested panel picture in integration's evidence folder.
