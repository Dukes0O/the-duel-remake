# ARENA-STEER

Arena drivers now share a factor of 2, a continuous low-speed rolling floor,
and a 150-degree/s ceiling. The frozen ceiling and steering suites pass.
This source is **not merge-ready**: the unchanged crate fixture still fails;
independent review, balance, browser, Claude and Kyle feel review, and the
mandatory lane/build gates remain pending.

## Settled rule and implementation

Claude's ceiling design is merged at `9918e6b0fb18a09e517a2388cf2c8227fded8f1f`.
Every car must turn at least 100 degrees/s at full lock from 15–50 mph,
at least 75 at its arena floor top, and no more than 150 at any speed.
The actual player and computer paths share `steeringYawAuthority`.
Both `course.def.venue === true` and `course.def.arena === true` are required.

The shared arena factor is 2, reduced from 3.4. It still multiplies both the
steering and tyre limits. The arena rolling floor is 0.85, approached
continuously from zero to 15 mph. Above 15 mph the existing speed curve
catches up to that floor. The lower steering/tyre limit is then capped at
150 degrees/s, including fully upgraded specialists. This keeps the
low-speed turn without the former 205–300-degree/s turns at 45 mph.

Road callers retain their exact released formula. Player driving and the
computer pilot already pass their actual course, so this follow-up changes
only the shared function and tuning in `src/config.js`. Their steering and
yaw response filters are unchanged. Sal's window applies its 0.5 scale after
the bounded authority, so it still halves normal steering exactly.

Actual stock player measurements use the real clear-floor integrator,
0.95 floor traction and first-tick drag, undoing only its known response
filter. These are degrees/s; floor top is the car's actual floor cap.

| Car | 15 mph | 25 mph | 45 mph | 50 mph | Floor top |
| --- | ---: | ---: | ---: | ---: | ---: |
| Falcone F42 | 102.400 | 102.434 | 120.510 | 119.823 | 85.436 |
| Stuttgart | 118.634 | 118.673 | 139.615 | 138.819 | 99.679 |
| Falcone Heritage | 102.400 | 102.434 | 120.510 | 119.823 | 85.436 |
| Aurora | 126.126 | 126.168 | 148.433 | 147.586 | 102.949 |
| Dusthawk | 131.121 | 131.165 | 150.000 | 150.000 | 112.836 |
| Banshee | 107.395 | 107.430 | 126.389 | 125.668 | 88.388 |
| Viper | 141.112 | 141.159 | 150.000 | 150.000 | 111.970 |
| Titan | 124.877 | 124.919 | 146.964 | 132.974 | 114.930 |
| Jesko | 149.853 | 149.903 | 150.000 | 150.000 | 105.189 |

The frozen suite also covers engine-only upgrades and every fully upgraded
matching specialist, both integrators, both steering directions, reverse,
boost ceilings, 0.25-mph sweeps to at least 400 mph, and both production
traction values. All meet their floors and ceiling. Held yaw approaches one
limit without oscillation; release settles below 1.5% within 0.3 seconds.

## Tests first and focused checks

Independent ceiling RED commit `3c759e0f096ba4eb52baf8f1a7d9bcae5abbc0ea`
had 274 checks: 144 intended ceiling failures and 130 passing controls.
The original stock/upgrade steering RED history is `8fc29c9` and
`29d96f7`: 215 checks, 130 intended minimum failures and 85 controls.

After the ceiling source change:

- `node tools/test-arena-steering-ceiling.mjs`: 274/274.
- `node tools/test-arena-steering.mjs`: 215/215, unchanged.
- `node tools/test-sal-fight.mjs`: 25/25 subtests, 119 acceptance checks.
- `node tools/test-titan-handling.mjs`: 40/40.
- `node tools/test-titan-climb.mjs`: 10/10.
- `node tools/test-muddy-hollow.mjs`: 50/50.
- `node tools/test-replays.mjs`: all 162 released fingerprints unchanged.
- `node tools/test-combat-replays.mjs`: 12/12 unchanged.
- `node tools/test-arena-feel.mjs`: 5/5.
- `node tools/test-warlord-format.mjs`: 24/24 subtests, 256 checks.
- `node tools/test-arena-event.mjs`: 11/12. The crate assertion remains red.

No lane/full gate, production build or new browser/balance result is claimed
by this implementation freeze. The previous 3.4 browser/balance records
are historical evidence, not clearance for this different curve. App demo
edits still wait for Fuel Run. The existing memory-only App entry can supply
new private browser evidence without editing Fuel's files.

## Unchanged crate failure: legal collection after spawn

The original assertion at `tools/test-arena-event.mjs:241` expects all five
crates still present after the first delay plus 0.1 seconds. The current
curve allows an eligible computer car to take one within that interval.

Exact witness: seed 1989, Medium, Banshee player, Dusthawk/Aurora/Stuttgart
field, countdown skipped, then the original 3.1 seconds of real Duel steps.
At 3.008333333333325 seconds all five crates are present and
`state.combat.arenaCrateSerial === 5`. At 3.0749999999999917 seconds a real
`powerupCollected` event identifies rival index 1, Aurora `cpu-2`, taking
crossbow crate `ramp-1-1` for one charge. Its position is
`s = 221.38378407170376, lateral = -1.3655299866387547`, speed
43.006451754857416 mph, air height 0 and armor 50/50. The crate is at
`s = 218.6, lateral = 0`. Their world distance is 3.050887859807759 m,
inside the unchanged 3.2 m collection reach. At 3.1 seconds four crates
remain, the serial stays five, and the taken spot's respawn wait is
11.975000000000001 seconds. This is collection after all five spawned,
not a missing spawn.

At the c73ce03 source freeze the fixture and assertions were unchanged.
Independent review subsequently proved legal collection and approved a native
finite-protection fixture with every existing assertion retained. The
Director applied that correction after approval; see the follow-up below.

## Fingerprints and protected files

All ten original full-state road controls are unchanged. The protected
control JSON still has SHA-256
`33c621d8897faa5d06af9e763a70321c22c6f5fdbd48cd49a3edcb07491302b0`.
No road pin, arena pin or world signature is regenerated.

Current named arena full-state traces (seed 1989, Falcone, 120 Hz, 12 s;
existing steering test's `arenaReplay` input recipe) are:

| Trace | Current fingerprint |
| --- | --- |
| Last Car Rolling | `90e484f1494eed7425c6753ccb0752227ce10a27d50d4c4bdd18d260099b9a90` |
| Sal | `254faed666cc15f0555a7d5b8c9f05a17df49bdd2dd9e4e6fb6b829216be3dac` |

Both frozen suites prove identical seeded arena state at 30, 60 and 144
rendering fps. These current hashes are review evidence, not replacement
pins. The independently measured pre-ceiling hashes will be compared at
review rather than silently substituted.

The old steering suite SHA remains
`9e235ca43867464ce9319a2f788842fb2018b29b87db4dc82b077a743b80b85f`;
at the c73ce03 freeze the crate suite SHA was
`7b7f48ceaf44e733bc9cfaf9e674527bf234a066c359951719250e79789d74f6`;
the later fixture correction is recorded below;
the frozen new ceiling suite SHA remains
`a32aeba16f24d9a922763867e7b729992a48e60766d3dcdf2646e70e2e96c6b6`.

## Changed assertions

Every existing assertion remains unchanged. The reviewed crate timer fixture
now uses finite native protection and adds an unprotected moving-CPU control.
The browser scenario adds ceiling, clear-release and authored-kit readiness
checks. No source behavior is adjusted to hide legitimate collection.

## Sound

No new game event is added. Existing tyre, engine, collision and Sal sound
cues remain unchanged. No audio ownership or file is used.

## Removed

The uniform 3.4 arena multiplier is replaced in the same shared function by
the smaller factor, low-speed floor and physical cap. No duplicate driving
path, runtime dependency, model or other asset is added. Prior reviewed raw
browser and balance evidence was consumed: 44 files, 28,920,464 bytes; its
verdict is retained in text history. Current game assets, licensed originals,
Kyle's decisions, unmerged source and protected assertions stay.

## Ceiling acceptance RED freeze — 30 September 2026

Claude’s 150-degree-per-second ceiling is now merged into this lane at
`9918e6b0fb18a09e517a2388cf2c8227fded8f1f`. The uniform 3.4 source is unchanged;
the earlier note about an unmerged design branch no longer applies.

The independent test author added only `tools/test-arena-steering-ceiling.mjs`
and this note. `node tools/test-arena-steering-ceiling.mjs` produces **274
checks: 144 intended failures and 130 passing controls**. Exit code is 1.
Every failure is a measured ceiling violation, not a setup error:

- 27 shared-authority speed sweeps, stock, engine-only and fully upgraded
  matching-specialist specimens for all nine cars. Sweeps include quarter-mph
  samples through at least 400 mph, low-speed boundaries, floor tops and both
  production traction values. Actual maxima range from 215.650 to 410.261 degrees/s.
- 54 actual player/CPU first-tick paths in both turn directions, including
  standstill, reverse-sign controls, the 15–50 mph range, each car’s floor top
  and its boost ceiling. These recover only the known response filter;
  the measured request remains the production driving result.
- 54 sustained raw-yaw paths. Both held directions and the real 0.3-second
  release checks execute before the final ceiling assertion. Yaw approaches
  one limit, does not oscillate, and settles below 1.5% on release, but exceeds 150.
- Nine actual Sal-fight player cases keep the same floors but exceed the ceiling.

The passing controls require at least 100 degrees/s from 15–50 mph and at
least 75 at the actual floor top for both driving paths and both directions.
Sal’s real brain requests a 0.5 window, and her actual pilot halves the same
authority exactly. Released road/Muddy/Titan formulas and all ten original
full-state road fingerprints remain exact. Actual arena full-state runs repeat
with identical fixed ticks at 30, 60 and 144 graphics fps.

Clear-floor measurements reset position and requested speed between physical
samples. They do not replace either integrator. Resetting a CPU distance-watch
sample prevents the artificial stationary pose from triggering unrelated
unsticking; steering, yaw filtering, floor traction and real player drag run.

Every named failure message is reproducible with the command above and was
saved for the next review in `.evidence/2026-09-30/ARENA-STEER/steering-ceiling-red.txt`.
Examples: stock Falcone actual player 204.867 degrees/s, stock Titan 249.838,
fully upgraded specialist Jesko 389.748; all must be at most 150.

Protected focused controls before source changes: existing arena steering
215/215; Sal fight 25/25 subtests and 119 acceptance checks; Titan handling
40/40; Titan climb 10/10; Muddy Hollow 50/50; road replay fingerprints 162/162.
The original crate
fixture and its assertions remain untouched. No lane/build, balance, browser,
Preview-feel or merge clearance is claimed by this RED freeze; those follow
implementation and independent review.

SHA-256 at the RED source:

| File | SHA-256 |
| --- | --- |
| `src/config.js` | `2e0ffaa15beaece0d12d93675857b953ce6a646c4b858898284d67e515700be5` |
| `src/sim-driving.js` | `c9c41f7d2bbdc5300bd7d14a524a09a688044ed899608e4d3da3bed0c779d71b` |
| `src/arena/arena-pilot.js` | `f2bfa54d0f0cd19382fd8aa67b2aeec1e9f790a274f5f220e7510d7e7dcd071c` |
| `tools/test-arena-steering.mjs` | `9e235ca43867464ce9319a2f788842fb2018b29b87db4dc82b077a743b80b85f` |
| `tools/test-arena-event.mjs` | `7b7f48ceaf44e733bc9cfaf9e674527bf234a066c359951719250e79789d74f6` |
| `tools/replays/arena-steering-controls.json` | `33c621d8897faa5d06af9e763a70321c22c6f5fdbd48cd49a3edcb07491302b0` |
| `tools/test-arena-steering-ceiling.mjs` | `a32aeba16f24d9a922763867e7b729992a48e60766d3dcdf2646e70e2e96c6b6` |

### Changed assertions — ceiling RED

None. This adds a new suite and reads the existing replay pins without writing
or regenerating them. No existing suite, source, runtime asset or rule is edited.

### Removed — ceiling RED

None. This freeze adds acceptance tests only. The implementer owns the source
change and the follow-up note once the Director releases this freeze.

## Reviewed fixture and clear-floor browser follow-up — 30 September

Independent read-only review confirmed that the old timer fixture mixed
spawning with eligible collection. Before changing its context, the Director
added a native moving-CPU collection control: 12 of 13 tests passed and the
original five-crate assertion failed. Finite pickup protection now isolates
only the initial and respawn timer intervals. The player is unprotected for
the backwards repair pickup. All original assertions are byte-for-byte
unchanged; the new control proves five actual spawns, legal moving-CPU reach,
floor height, no protection, one native charge, removal and respawn timing.
The corrected suite passes 13 of 13. No gameplay pickup guard changed.

The browser starts each actual full-lock arc at a clear central floor pose,
then never resets it during 1 s of driving and 0.3 s of release. Added checks
retain the 150 degree/s ceiling, avoid knock/air/armor loss, and require at
least 40 mph coasting. High and Performance screenshots show the entire
Falcone, Titan and Jesko, front bumpers and crossbows clear of walls. Release
speed is 43.93 mph; Sal still physically halves authority in her natural
window. Both private runs used memory-only saves with no console errors,
warnings or failed requests.

The first clear-pose run failed the Performance spark-visibility assertion;
an unchanged repeat passed. Body readiness does not imply asynchronous
authored-kit readiness. The scenario now waits at most 30 s for the actual
visible spark node, calling production onFrame/renderFrame without advancing
Sal or changing the original visibility assertion. This final readiness
change still needs its own fresh browser result. The hunting badge overlaps
placing text at 1280 by 800; record that separate HUD debt while Fuel owns
the HUD. Human Preview feel and audible Sal review remain pending.

## Full-field balance result — blocked for Claude

The complete 108-round report at unchanged c73ce03 source used 36 rounds per
difficulty. Medium averages 23.3 full-field wrecks against SCRAPDOME section
8 target 10–14. Original baseline was 15.7; prior factor 3.4 was 24.4. The
ceiling reduces this by 1.1 but does not meet the target. Easy and Hard means
are 20.9 and 21.9. Proximity is 53/52/51%, wall hits 0.1/0.1/0.8 per round,
and reverse time 5.8/8.2/9.5%; those measured limits pass. Wins out of 36 are
8/4/1 and mean player places 2.19/2.58/2.72.

No settled handling floor, ceiling, speed, collision, damage or balance target
is relaxed. Route the measured wreck gap to Claude in decisions and the
playtest inbox. Mandatory exact lane/build gates, this design/balance review
and Kyle feel remain before merge. No whole-card clearance is claimed.

### Removed — fixture and browser follow-up

Removed the timer fixture's accidental dependence on how fast a CPU arrives
after spawning, and the browser's immediate body-only assumption for Sal
kit readiness. Kept all original assertions, road pins, current assets,
physical pickup rules and simulation source. Raw failed/passing evidence
stays private until the pending review consumes it.
