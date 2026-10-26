# HELI-LOGBOOK

Status: code complete; paint round 1 awaiting Claude. Switch: `heli-logbook` (dev).

## Design before code

Use HELICOPTER 14.1 and the card's exact Gus and Roger text. Ranks are
successive: lessons, ten completed flights, the three job kinds, rescue and
ski drop, then fifty completed flights and every landable map place. The
Ardennes has no landing zone and is excluded; the Table is included. A place
means one map place, so Summit's two courses share a visit. Counts start when
the switch is enabled; old cruise-arrival totals cannot prove landings.
Keep the existing `heli.flights` counter unchanged for its existing callers.

A flight needs a liftoff and a non-crash touchdown inside a place's landing
circle. Cruise arrival is still airborne. Crashes, quitting and reloads do
not complete a flight. Only successful job completion counts, including
return crates. Ranks are awarded at home, persist once, and repaint there.
The shelf can be opened again at home. Map clues mark places without granting
discovery, jobs or credits. Radio is text; no new sound cue is required.
Chief includes Ana's text call from the story draft. No submarine job is
offered; that job belongs to the later Deep card.

Checks: counting/rank/old-save/shelf tests and a scripted career; existing
save/skin/session checks through the lane tier; build. Browser pictures use
memory-only saves and a private dev port. No frame timing. Paints stop after
round 1 for Claude's review.

## Independent save and code review

Save guardian: clear. One reproduced fault fixed: automatic rank repaint now
waits for an active rescue to end, preserving mission gear. Its actual-session
regression failed before the fix and passed after it. Safe per-field copying
also prevents malformed future fields from throwing during normalization.
The focused follow-up review is also clear: automatic and shelf repaints use
the existing cable reset, fresh-coat and transition behavior. New regression
checks failed before that fix and passed afterwards; idle sessions refuse
repainting.

Review checks passed: 23 historical and one forged fixture (1,029 preservation
checks), 784 damaged/partial cases, backup, budget/recovery, fines (225), and
actual quit/reload flows (280). All five rank paints and counters add about
1,104 bytes per profile, within existing storage headroom. Both new logbook
suites pass. Tests use memory storage; no real saves accessed.

## Changed assertions

- Feature catalog count: 40 to 41 non-course switches for `heli-logbook`;
  add it to the dev-only assertion. No assertion is loosened.
- `test-heli-skins`: the exact `SKINS` key roster gains the five rank paints.
  The mission-skin list and its five-mission earning and gear rules stay exact.
- `test-heli-jobs`: existing fixed-step car and return-crate scripts run with
  the logbook enabled and add assertions for one completion of the right kind.
  Existing payment, delivery and replay assertions are unchanged.
- `test-heli-mode`: both the drawing-file pattern and drawing-file set gain
  `heli-rank-paint.js`; the graphics/rules boundary remains enforced.
- `test-browser-scenarios`: exact manual-only discovery difference gains
  `heli-logbook-art`; two new assertions require its absence from ordinary
  runs and presence in manual discovery.
- `test-blender-output`: exact generator roster gains the paint recipe.
  Six new checks require standard-library-only planning, successful process
  status, empty Blend/GLB lists, the exact five PNG homes and no default
  evidence output. No existing assertion or tolerance is removed or relaxed.

## Gate evidence

Initial lane gate on `0ae051d7` plus the already-present manual-scenario
exclusion: 10 passed, 1 failed, 91 not run (349.88 s). The failure was the
unregistered Blender paint generator. Its roster and output planning were
fixed; the failed suite alone passed 87 checks. The corrected source is
being checked below; the failed first run is not a passing gate.

Second lane gate on `de2c5dec`: 76 passed, 1 failed, 25 not run (421.61 s).
The existing Preview test correctly required the new dev switch in the
launcher's requested flags. Added `heli-logbook` to `start-preview.bat`;
the unchanged Preview suite then passed all 23 checks. No test assertion
changed for this fix. No failed or partial gate is reported as green.

## Pictures

[Round 1](../board/looks/heli-logbook/round-1.jpg) is 493,500 bytes. The
memory-only art scenario passed on private port 33666: 25 pictures, zero
errors or warnings, High and Performance at near and native distance. The
shelf shows all four Gus pages. No frame timing ran.

Stop after round 1. The door kestrels are obscured by the canopy boundary;
wear and reflective-band readability need Claude's verdict. These paints
are candidates, not accepted art. See the round note for the full findings.

## Removed

No old game behavior or runtime art replaced; existing mission skins remain.
Created raw pictures, diagnostic Blender renders, temporary originals and an
unused runtime-folder credits file were recycled after review. Recipes,
provenance and one compressed round sheet remain.
