# HELI-LOGBOOK

Status: paint round 2 ready for Claude's verdict. Switch: `heli-logbook` (dev).

## Paint round 2 (26 October 2026)

Claude's round 1 verdict and assertion approvals are on the card. Integration
was merged at `efadcd50`; only STATUS and the card conflicted. Kept this
lane's STATUS and both card sections. There were no code conflicts.

Round 2 follows that verdict: a hand-width bright silver cabin/boom line on
Private; a clear cream cabin band and large tail-boom kestrel on Commercial;
a broad red belly, red fin and tail-boom kestrel on Chief. Keep Student and
Mountain colours and bands. Add light exhaust soot and skid scuffs to all
five. The current airframe, ranks, saves and mission rules stay unchanged.

Checks: paint helper behavior/restoration, existing Blender output planning,
and the same native High/Performance near/distance browser pictures as round
1; then lane tier with four jobs and production build. Read the integration
inbox before every heavy run; wait for frame/release holds. No frame timing.
Stop at the round 2 sheet for Claude; do not start round 3.

Round 2 independent rendering review: clear. Skid materials are cloned only
for rank paints; shared mast metal remains untouched. Switching to stock or
mission paint restores original materials, and scene disposal releases the
clones. No race or save state changes were added.

Round 2 assertions: four new checks in `test-heli-rank-paint.mjs` require the
skid clone, unchanged shared mast material, original skid restoration on
paint change, and original restoration before disposal. Every existing
assertion is retained; none is relaxed. Claude approved the round 1 changes
on the card.

First round 2 lane gate on `232797b4`: 83 passed, one failed, 19 not run
in 389.16 s. The current evidence check requires `round-N-review.md`
beside each tracked sheet. Renamed both paint notes to that convention;
no test changed.

Corrected lane gate: **103/103 passed**, zero failed or not run, in
853.75 s. Production build passed in 1,341 ms (Vite 836 ms). Tested game
code and assets are `232797b4`; subsequent changes are the sheet, review
notes, card and status. Both gates used PowerShell with System32 first on
PATH. Before each heavy run, the absolute integration inbox had no active
hold and the count was below three; the lane's minute check counted two.
Replay fingerprints and world signatures passed unchanged. Build retains
the existing chunk-size and mixed-import warnings.

The native browser check passed on private port 25388 with memory-only
storage: 25 pictures, zero warnings or errors. The same High/Performance
near/distance views are in [round 2](../board/looks/heli-logbook/round-2.jpg)
(494,163 bytes), with findings in `round-2-review.md` beside it. Independent
rendering review is clear. No frame timing or round 3 ran. Claude's round 2
art verdict remains open. Cockpit sync updated one task from integration's
authoritative board.

Round 2 removed: replaced all five runtime texture maps at their existing
paths and removed the door-kestrel motif. The maps total 5,001,151 bytes,
86,447 fewer than round 1. Recycled own raw captures, temporary originals
and QA bundle after composing the sheet. Both compact round sheets remain;
current gate/build logs remain for handoff. The matching review notes were
renamed rather than duplicated. No save keys or race rules changed in this
round; the original independent save review remains clear.

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

Final code `cd396f5b`: `node tools/run-tests.mjs --tier lane --changed --jobs 4`
passed **103/103**, zero failed or not run, in 1,086.44 s. `npm run build`
passed in 2,480 ms (Vite 1.98 s). Both ran from PowerShell with System32
first on PATH, with admission counts below three. The minute check found
one heavy job. No frame timing ran.

Replay fingerprints stayed pinned: 225 checks, 25 cases, three frame rates
and three runs. Combat replay guards and the 47 complete-scene/world checks
passed. No fingerprint or signature was re-recorded. Board checks: 191 pass.
Cockpit sync: zero changes and no untracked cards reported.

The final handoff commit adds the sheet, its composition recipe, provenance,
card handoff and status only; the tested game code remains `cd396f5b`.

## Pictures

[Round 1](../board/looks/heli-logbook/round-1.jpg) is 493,500 bytes. The
memory-only art scenario passed on private port 33666: 25 pictures, zero
errors or warnings, High and Performance at near and native distance. The
shelf shows all four Gus pages. No frame timing ran.

Stop after round 1. The door kestrels are obscured by the canopy boundary;
wear and reflective-band readability need Claude's verdict. These paints
are candidates, not accepted art. See the round note for the full findings.
The five current runtime maps total 5,087,598 bytes; the sheet adds 493,500.
This growth provides five distinct paints on the existing airframe, without
duplicate models or retained source binaries.

## Removed

No old game behavior or runtime art replaced; existing mission skins remain.
Created raw pictures, diagnostic Blender renders, temporary originals and an
unused runtime-folder credits file were recycled after review. Recipes,
provenance and one compressed round sheet remain.
The consumed lane QA/build folders were also recycled (694,946,198 bytes).
Gate/build logs remain as unconsumed integration handoff evidence. The audit's
five new texture candidates are confirmed dynamic loads in the paint helper
and the native browser pictures; no existing candidate was removed.

## Claude review (26 October 2026)

Approved and merged; paints accepted at round 2; changed assertions approved on the card; independent save review clear.
