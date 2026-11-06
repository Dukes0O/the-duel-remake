# MULE-RAILS

## Changed

- Caption timing no longer blocks step runners. Only `opening` and `closing`
  hold motion, and Space skips only those held lines. A line requested both by
  a runner and `startLineId` is queued once.
- Drivetrain steps without `stopAtEnd` finish at their path end. Gate steps
  also require the gate to pass. Slow gate hits reset the stopped train 300 m
  before the gate. Track pickups reduce speed by 2 m/s once each, including
  across a bounce and retry.
- Boarding resumes at the last reached roof plate. The rider is lifted to roof
  height and carried with the train each tick, with foot movement applied on
  top. The 25 m fall range spans the walk between the 20 m spaced wagon
  markers. The rider falls onto the ground beside the train without damage.
- The headless Iron Mule driver now runs the real Coupling and all three On
  Time steps through `Duel` and `stepArenaEvent` on Easy and Hard. It checks
  opening actor placement, roof riding, the guard, pickups, gate clearance,
  final stop and same-seed repeatability.
- Story section 5 now matches the implemented step and caption behavior.

## Checks

- `node tools/test-iron-line.mjs` — passed. Includes two matching Easy runs, a
  Hard run, the roof guard and 20 m/s gate, pickup idempotence over a bounce
  and retry, caption motion, reboarding and end-to-end completion at the Halt.
- The focused Iron Mule test passed again after adding explicit checks that
  each pickup removes exactly 2 m/s. That test-only assertion update followed
  the lane-tier run.
- `node tools/test-everburn-easy.mjs` — passed unchanged; all nine jobs
  finished 10/10.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` — all
  70 selected suites ran; 69 passed. `tools/test-warlord-tollkeeper.mjs`
  failed only because `ffmpeg` could not launch (`ENOENT`), as expected for
  this job. Replay checks passed: 297 checks over 33 cases; fingerprints and
  world signatures remain unchanged. The wrapper stayed open after reporting
  `[70/70]`; it was stopped after the full result was captured.
- `npm run build` — passed. Vite reported the existing dynamic-import and
  large-chunk warnings.
- Browser and look checks remain for Claude. Please check Coupling boarding,
  walking both roof plates, Hard guard push and reboard, falling beside the
  wagon, planting and getting clear; then Easy and Hard On Time captions,
  train placement as the opening begins, gate and pickup behavior, and the
  stopped arrival at the Halt.
- Claude should rerun `tools/test-warlord-tollkeeper.mjs` where `ffmpeg` is
  available.

## Changed assertions

- Updated `tools/test-iron-line.mjs` to expect an opening caption to create the
  train at the path start without moving it. Nonblocking caption sequencing is
  now advanced by elapsed time rather than Space, and each pickup's 2 m/s loss
  is checked directly. These changes assert the requested behavior; no
  assertions or tolerances were weakened.

## Race fingerprints

Unchanged. No replay baseline or world signature was regenerated.

## Removed

Removed the unconditional caption hold, the 150 m rolling bounce behavior,
and the gate-only pickup trigger. No files or assets were deleted.
