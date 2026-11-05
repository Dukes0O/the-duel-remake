# BOWL-COURSE

## Changed

- Added a Bowl-only view for the authored stadium, floodlights, colored light pools, crush props and fire. The view loads only when `def.bowl` and the `titan-bowl` switch are both active.
- The crush line now uses nine game junk cars, then the authored crushed bus and RV, followed by the authored burning bus stack. Each car and shell has a faded individual tint. The cone flame is not used.
- Flame jets use the game's fire flipbook and fire in a repeating cycle beside the course ramps. The heap uses the same animated fire effect continuously.
- Added a small `render3d.js` hook to create, update and dispose the Bowl view. No other course renderer behavior or race state is changed.
- Kept the course definition and simulation data scoped to `def.bowl`; existing course ordering and race fingerprints remain unchanged.

## Checks

- `node tools/test-bowl-course.mjs` — passed before and after the lane tier. Covers ramp launch, crush deformation, stadium and vehicle presentation, unique salvage rows, flame-jet timing, heap fire and existing course order.
- Lane tier `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` — reached `[309/309]`; the Bowl course suite passed. The runner stayed open after the last result, so it was stopped after all entries had reported. Three suites failed and were each rerun once on the final code with the same result:
  - `tools/test-audio.mjs` — runtime recording count assertion: “all eleven runtime recordings loaded.”
  - `tools/test-circuit-eifel.mjs` — FFmpeg loudness measurement failed while measuring the Eifel sound bed.
  - `tools/test-full-check.mjs` — its temporary Git-copy case could not start `pwsh` (`spawnSync pwsh EACCES`). The other 45 checks in that suite passed.
- `npm.cmd run build` — passed on rerun (Vite exit code 0). Existing dynamic-import and large-chunk warnings remain.
- Browser and look check — Claude runs in Chrome. No browser was run in this lane.
- Race fingerprints — `test-replays.mjs` passed 297 checks across 33 cases and 31 events. Existing course and world geometry guards passed; no signature fixtures were regenerated.
- Changed assertions — added Bowl presentation assertions. No existing assertion or tolerance was changed.

## Claude look check

In Chrome, with `titan-bowl` enabled, check:

1. The Bowl reads as a night stadium: the stands wrap the venue, the crowd is visible, and the floodlights illuminate the dirt, ramps and crowd without washing out the scene.
2. The three authored ramps sit within the stadium floor. Flame jets are beside the ramps, visibly turn on and off, and do not stay lit for the whole cycle.
3. The crush line reads in order at truck height: varied faded junk cars, then distinct crushed bus and RV outlines, then the fallen burning heap. Props sit on the dirt at their crush targets.
4. The burning stack uses its `crush.glb` geometry and animated fire from the game's fire effect, with no cone flame. Confirm the bus/RV paint remains readable under night lighting.
5. Switching away from The Bowl leaves the existing Titan courses visually unchanged.

## Removed

Removed the old change-note claim that the Bowl visuals were unwired. No runtime file or asset was removed.
