# WW-EVERBURN-JOBS

## First job play fixes (5 November 2026)

- Kept the Scablands venue through the App and Game start calls. The visible
  Scrapdome leak came from generic arena HUD and course scenery being applied
  to the Scablands definition. Scablands now skips those Scrapdome barriers
  and road furniture, and its job HUD shows the world venue.
- World jobs start at the first step's authored place. The in-race panel shows
  the job name, step number and hand-written step line, uses elapsed time, and
  hides arena score rows.
- Every Everburn job step, including side jobs, has a full-sentence `what`.
  The HUD uses it instead of turning internal load IDs into player text.
- Loaned car Flamethrowers use key 4's existing slot for the job and return to
  the saved loadout afterward. Cinder's Hand Flamer loan selects her foot gear
  and restores the player's crew and gear selection when the job ends.
- `tools/scenarios/everburn-play.mjs` now checks the venue, finite HUD text,
  job identity and step, scoreboard removal, the Flamethrower slot, start
  position, Scablands map and marker, and keyboard progress to the next step.
  The browser scenario is for Claude to play; Chrome is unavailable here.

### Checks for these fixes

- `node tools/test-everburn-easy.mjs` — passed; all nine jobs finished 10/10.
- `node tools/test-world-job-mode.mjs` — passed; car and foot loans, F exit,
  step HUD, and saved loadout/crew restoration.
- `node tools/test-world-jobs.mjs` — passed; job engine scenarios and
  repeatability checks.
- `node tools/test-world-job-mode.mjs` — passed; every Everburn step has a
  sentence, and the map marker points to Tin Town.
- `node tools/test-replays.mjs` — passed; 297 checks, fingerprints unchanged.
- `node tools/test-combat-replays.mjs` — passed; 12 checks.
- `node tools/test-world-composition.mjs` — passed; 63 checks across 20 events.
- `npm.cmd run build` — passed. Vite emitted its existing chunk-size and
  dynamic-import warnings.
- Browser scenario and lane tier — not run here, as instructed.

### Changed assertions

- Added assertions for the explicit Everburn step lines, the job HUD and
  fourth-slot loan, and Hand Flamer gear restoration. No existing assertion
  or tolerance was weakened.

### Race fingerprints

- Replay and combat replay fingerprints stayed exact.

### Removed

- Removed Scrapdome barrier and road-furniture generation from Scablands.

## Changed

- Applied Claude's Easy finale plan. The car lends the Flamethrower through
  both the defence waves and furnace chase. Between cleared waves, Hollis's
  job-only supply refills the car weapon and the RPG for an optional foot run.
- Easy defence counts are 1/2/2. Medium and Hard remain 2/2/3. Raiders enter
  32 m from the well, walk toward it, and hold on the approach so the car can
  burn them without leaving the vehicle.
- The mounted Flamethrower now damages job raiders it catches in its existing
  cone. It uses the settled 30 health/s Hand Flamer rate in `docs/CREW.md`;
  shared combat tuning and the car weapon's damage and cooldown are unchanged.
- The child-pace driver steers with the keyboard, waits until the car faces a
  raider, and holds position while firing. It has no instant aim.
- `src/render3d.js` draws Hollis's supply as a simple timber-and-iron crate.
  This stands in for the supply crate planned by WW-ART-KIT. Existing job-car
  stand-ins remain `falcone_heritage` for Big Bess, `dusthawk_rally` for the
  thief buggy, and `titan_monster` for Old Smoke's furnace (WW-ART-VEHICLES).
- `src/app.js` and `src/game.js` keep the existing WW-HOOKS route that starts a
  real world job and restores its loaned loadout on exit; this slice did not
  change those files. `src/arena/modes/world-job.js` applies the job-only refill
  and places the approaching raiders.

## Checks

- `node tools/test-everburn-easy.mjs` — passed; all nine jobs finished 10/10
  on Easy through real `Duel` inputs.
- `node tools/test-world-job-mode.mjs` and `node tools/test-world-jobs.mjs` —
  passed.
- `node tools/test-replays.mjs` — passed, 297 checks; no world job ran and
  replay fingerprints stayed exact.
- `node tools/test-combat-replays.mjs` — passed, 12 checks.
- `node tools/test-scablands-ground.mjs` — passed, 5 tests.
- `npm.cmd run build` — passed. The PowerShell `npm.ps1` wrapper was blocked
  by execution policy, so the same npm build ran through `npm.cmd`.
- Lane tier — not run, as instructed for this lane.
- Browser and look check — Claude runs; Chrome is unavailable in this job.

## Changed assertions

- None. The acceptance bar remains at least 8 wins in 10 runs for every job.

## Race fingerprints

- No world job is running in replay checks. Expected fingerprints remain exact.

## Removed

- Removed temporary trace output used to diagnose the Easy driver. No scratch
  diagnostics are part of the game or test.

## Review

- **Blocked:** `stepDefend` requests the job refill on every tick while a wave
  remains. The mode clears the car weapon cooldown and restores RPG ammo each
  time, so this is continuous supply during combat rather than a between-wave
  refill.
- **Blocked:** the real mode passes `worldJob.placeHealth` to the job step, but
  never updates it when raiders reach the well. The well-fall wave restart
  cannot occur in a real defence.
- **Blocked:** projectile and flame contact paths request newly allocated
  world-job target arrays and target objects repeatedly during simulation.
  These paths need a shared per-step snapshot or non-allocating iteration.
- The first issue needs a change to the defend-step hook; target snapshots
  also touch combat files outside the named WW-HOOKS hooks. Re-slice those
  fixes before changing code. Focused checks and the build passed, but do not
  cover these findings. Replay fingerprints remained exact in the reported
  replay check.
