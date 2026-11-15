# EVERBURN-REMAKE, slice 1: the ember and the ground

Job 1 (Hot Delivery) now carries live fire in an open pot. How the car is driven decides whether the ember arrives. Everything stays behind `story-everburn` (still `dev`).

## Changed

- **The ember rule** (`src/world/jobs/ember-rule.js`, used by `src/world/jobs/steps/carry.js`). The pot starts at 100 and stays between 0 and 100. Cold takes 0.33 a second. On rock (anywhere that is not road) the pot loses 0.12 for each km/h over 50, each second; on road, nothing from speed. A hit that sheds more than 8 km/h in one step takes 1.5 for each km/h shed. Easy halves rough ground and hits; cold is the same. At 0 the pot is out: the job goes on, the car is not moved, Cinder's spill line is said, and the marker moves to the nearest brazier (the yard gate, or the halfway camp `safe-road` once passed). Arriving there under 20 km/h gives a fresh scoop (100) and counts one relight. The job completes at Tin Town only with the pot alight.
- **Hits are measured in the world-job mode** (`src/arena/modes/world-job.js`): the speed shed between two steps, read after the car's own physics and contacts. No car physics or other mode was touched. The old "one crash above `crashLimit` restarts at the safe point" rule is gone from job 1, and `crashLimit` is removed from job 1's data. Hot Soup keeps the old carry rule (the carry step still has it for steps with no `ember`).
- **Pay by ember** (`src/arena/arena-settlement.js`, `arenaReward`): 70 or more "bright" 120, 30 to 69 "alive" 80, under 30 "barely" 50, capped at 80 after any relight. Every other world job still pays 80. The grade is shown on the results screen in one plain sentence (`src/screen-arena.js`) and is not stored: the save's shape is unchanged.
- **The road** (`src/world/scablands-road.js`): the road is data (a list of points and a half width: yard gate, halfway camp, round the south of the scab field, up to Tin Town's gate, about 715 m) and `onScablandsRoad(x, z)` asks it, plus the dirt road the land already has round the oval. The function takes its points as input and assumes nothing about the size of the land. The ground drawing reads the same points (`createGroundLook({road})` in `src/world/scrap-look.js`) and draws the road as a darker band. No rock plates, no ruts, no new model or image files.
- **The pot on the car** (`src/world/ember-pot.js`, hooked in `src/render3d.js`): a dark iron pot with a bail and a bracket on the back of the player's car, wearing the existing scrap wear, with uneven live coals, a flame and sparks. The glow and flame follow the ember (bright, dull, dark at 0); sparks fly while the pot loses more than 1 a second and in a burst at a hit. It reads the ember and never changes it.
- **The ember gauge** (`src/world/world-hud.js`, `world-hud.css`): EMBER and a glowing bar above the speed readout at the lower right. It flickers while the pot is losing ember, flashes at a jolt, and says OUT with "back to the brazier" at 0. Nothing else in the HUD was restyled.
- **Braziers** (`src/world/ember-pot.js`, `src/world/scablands-scene.js`): an iron bowl on legs with live coals, a tall flame, firelight on the ground and sparks, beside the yard gate and the halfway camp, drawn only while job 1's carry step is on.
- **Sound cues**: `world.ember.spark` (a jolt), `world.ember.out` (the pot going out) and `world.ember.scoop` (a fresh scoop) are made in code in `src/sound-bank.js` and played through the arena tell event. No sound files were added.

## What the drawing added

- Ground: no draw calls and no lights. About five point-to-line distance tests for each ground pixel, and no extra texture reads.
- The pot on the car: 4 draw calls (iron, coals, flame, sparks); no per-frame allocation (positions are rewritten in place).
- The braziers: 5 draw calls each, 10 together, only while job 1's carry step is on and only when in view.
- Frame time was not measured: the frame check needs the laptop's own screen off and nothing else running.

## Checks

- `node tools/test-ember-pot.mjs` (new): 40 checks passed. (a) the road at 150 km/h arrives bright (93 ember, 120 scrap); (b) the scab field at 120 km/h on Medium puts the pot out before the town; (c) the field at 45 km/h arrives bright (84); (d) a 7 km/h touch takes nothing, a 40 km/h hit takes 60, and a real hit on the pair of junk cars by the Boneyard takes a large share in one step; (e) at 0 the job goes on, the marker is the yard gate (or the halfway camp once passed), a stop under 20 km/h there refills to 100 and counts one relight, a bright arrival after that pays 80, a car at 40 km/h takes no scoop; (f) pay by grade; (g) Easy halves rough ground and hits; (h) the same seed and inputs give the same ember trace; (i) building the HUD model and drawing the pot every step leaves the trace identical; and the road question with points moved.
- Lane tier, from PowerShell: `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: 153 suites, 152 passed and 1 failed at first. The failure was `tools/test-p4-audio.mjs` (its pinned hash of the old sound bank saw the three new cues); fixed by leaving exactly those three cue names out of the pinned projection, as earlier cards did for theirs. It then passed with the pinned hash unchanged, and `tools/test-audio.mjs` passed. The other suites in that run, including `test-everburn-easy` (all nine jobs 10/10 on Easy), `test-everburn-play-start` (354 checks), `test-ember-side-jobs`, `test-world-job-mode`, `test-scablands-job-map` and `test-world-jobs`, passed.
- `node tools/test-replays.mjs`: 297 checks across 33 cases, fingerprints unchanged. `node tools/test-combat-replays.mjs`: 12 checks, unchanged.
- `npm.cmd run build`: passed (the existing large-chunk warning only).
- Not merged with `integration/wasteland`: it is three docs-only commits ahead of this branch's base (the card, the board and the SCABLANDS-LAND card), so no code check could differ.
- Browser scenario `tools/scenarios/everburn-ember.mjs` (memory-only saves): passed. Pictures of the start, the road, rock at speed, a hit, the pot out with the marker at the yard brazier, a scoop and the arrival are on one sheet, `docs/board/looks/everburn-remake/round-1.jpg` (about 230 KB); the loose pictures were deleted. No frame check was run (the laptop was not alone). No Scablands signature was re-recorded: the lane tier's guards passed and the ground change is a shader band with no geometry change.

## Changed assertions

- `tools/test-everburn-line-audit.mjs`: "a hard crash raises the spill line" for job 1 is now "the pot going out raises the spill line" (rough ground at 300 km/h for 3.5 s on Medium). Why: job 1 no longer spills on a crash size; it spills when the ember is out. Nothing is loosened: a crash size is also asserted to no longer spill job 1, and Hot Soup's own spill assertion (crash size 11) is unchanged.
- `tools/test-p4-audio.mjs`: the projection of the sound bank that is hashed now also leaves out the three new `world.ember.*` cue names. Why: they are new cues, as the Deep, machine, Lab and helicopter cues were before them. Nothing is loosened: the pinned hash is the same, every old record is still covered. The cues are made in code, so there is no recorded file to pin; they were heard by nobody here (no listening claim).
- No other assertion was changed.

## Race fingerprints

- Replay and combat fingerprints unchanged (see Checks).

## Not yet true (later slices)

- The car still drives through the gate posts, wrecks and buildings, so only junk cars, other cars and barricades can hit the pot today. That is slice 5.
- Cinder and her brazier at the gate, the loading of the pot, and the stop in Tin Town's bay are slice 3. The job still ends the moment the car is within 18 m of Tin Town.

## Removed

- `crashLimit` from job 1's data (both the step and its `easy` note) and the crash-size spill for job 1. The generic carry rule stays because Hot Soup uses it.

### The yard's drawing (Claude, 15 November 2026, night)

`src/world/scablands-yard-look.js` (new): `yardPlan()` (plain data: where each piece stands and the solid shapes), `yardShape`,
`yardSignShape`, the two pictures and surfaces, and `createYard({heightAt})`. Nothing calls it yet; Codex places it for job 1.
Run once in Node: 92 sheets, 3 containers, 10 posts, 109 solid shapes, 10,220 triangles, built in 52 ms. Seen in the game in a
visible window with the yard put into the scene by hand (not committed): look round 2. No test added (Codex's placing step
brings its own); no assertion changed. Sound: none, nothing here is an event.

**Removed (the yard's drawing):** nothing.

## Changed at the merge (Claude, 14 November 2026)

- **Rock costs ember by the metre, not by the second.** Claude drove the build flat out across the rock on Easy with one key held and the pot arrived (barely alive, 50 scrap, 20 seconds): a loss by the second lets a fast car cross the ground before the pot dies. `roughPerKmh: 0.12` (a second) became `roughPerMetre: 0.003` (for each km/h over 50, for each metre driven). At 120 km/h that is 7 a second where it was 8.4; at 206 km/h it is 27 a second where it was 18.7.
- **Changed assertion** in `tools/test-ember-pot.mjs`, reviewed by Claude: the pinned rock loss at 120 km/h for one second is `0.003 × 70 × (120 / 3.6)` where it was `0.12 × 70`. The number moved because the rule changed; the check is as strict as before. Two checks added: flat out on Easy puts the pot out before the town, and 200 km/h gets less far over rock than 100 km/h. 42 checks.
- Claude's verdict and what the slice still lacks are on the card, section "Slice 1 result".
- **The results sentence names no number.** It said "the most it pays is 80 scrap" beside "+96" on Medium, because the pay is multiplied by the difficulty. It now says "You had to relight it, so it pays less." Changed assertion, reviewed by Claude: the sentence check asks for "relight", "pays less" and no digit, where it asked for "80 scrap"; the cap of 80 itself is still checked on the line above it.
- Review note for the sheet: `docs/board/looks/everburn-remake/round-1-review.md` (Claude).
- **Changed assertion in `tools/scenarios/everburn-play.mjs`,** reviewed by Claude: the scenario held the accelerator alone and required job 1 to finish. That is the fault Kyle found. It now requires the opposite: the job does not finish that way, the pot goes out, and the gauge says OUT. It is stricter than before.


## Larger land, pickup work in progress (15 November 2026)

- The car starts 40 m west of the yard gate, facing east. The Hot Delivery carry step asks the player to stop within 8 m of Cinder's pickup point. Three new lines play in order before the pot and ember gauge appear; the ember does not cool during the approach or the lines. The pickup point follows the yard brazier's position. The pot is still drawn by the existing car renderer.
- This is **not a finished yard or start**. The Scrapdome yard and its solids, the east gate posts, and Cinder's figure have not been placed. The maps do not yet show only Cinder. Items 2 through 7 are also unfinished. Do not hand this to Kyle as a playable remake.
- `node tools/test-everburn-job1.mjs`: passed for the start distance and heading, approach distance and speed, the three lines, and the gauge before and after pickup. `git diff --check`: passed. This test does not prove the missing yard or the maps.
- No new game event or sound cue was added by this partial pickup.

### For Claude to run

The requested browser scenario has not been written or run. The full card checks, lane tier, replay and world-signature suites, and build remain for the final round. The long `test-everburn-easy` and `test-run-gas-medium` drivers will need a run after the new job rules are complete.

### Changed assertions, for Claude to review

None in this round. Race fingerprints have not been checked in this round.

### Codex decided (Claude to review)

None in this round. The pickup uses the existing brazier position, which must be reconciled with the finished gate and figure.

### For Claude to draw

The Cinder figure and any plain temporary yard details still need drawing.

### Removed

Nothing removed in this round. The old `everburn-play` scenario still needs to be rewritten or removed when the requested scenario is built.

## Larger land, start continued (15 November 2026)

- A simple Cinder figure now stands two metres from the yard brazier, at the pickup point. Other actor markers are hidden on both maps until the pot is loaded.
- `node tools/test-everburn-job1.mjs`: passed, including the figure, its distance from the brazier, and the map frame before and after pickup. `git diff --check`: passed.
- The yard, its gate and solids, and the remaining map work are still missing. Item 1 is not complete. No new sound event was added.
- For Claude to draw: Cinder's final figure.
- For Claude to run: the requested browser scenario remains unwritten. The lane tier, replay and world-signature checks, build, and long drivers remain for the final round.
- Changed assertions: none. Race fingerprints: not checked in this round. Codex decided: none.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, brazier locations (15 November 2026)

- Added three named brazier positions to Hot Delivery: beside the yard and Halfway Camp, and at the Wash in the river bed. The first two match the existing brazier positions. The positions use the land's names and record the ground height.
- `node tools/test-everburn-job1.mjs`: passed. It checks all three positions against their named places, the real ground and solid grid, and checks that the Wash point is in the river bed. `git diff --check`: passed.
- The new list is job data only. The third brazier, scoop, smoke and map discovery are still to be connected in the following steps. No sound event was added.
- For Claude to run: the browser scenario and final checks remain for the last round, including the two long drivers.
- Changed assertions: none. Race fingerprints: not checked in this round. Codex decided: none.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, brazier scoops (15 November 2026)

- Each named brazier gives up to 25 ember after the car stops within 8 m for three continuous seconds. Moving or leaving resets the wait. Each brazier can be used once, including to relight an out pot. Relighting still counts toward the existing pay cap. The scoop uses `world.ember.scoop`.
- `node tools/test-everburn-job1.mjs`: passed using the real job step at all three braziers, including an interrupted stop, the distance limit, relighting and one use each. `git diff --check`: passed.
- The marker for an out pot still uses the old locations; discovery and the nearest known brazier are later steps. Smoke and the Wash brazier drawing are also still to come.
- For Claude to run: the requested scenario, final checks and the two long drivers remain for the last round.
- Changed assertions: none. Race fingerprints: not checked in this round. Codex decided: none.
- Removed: the old immediate full refill at the origin or passed safe point for this job; other ember carries retain their existing rule.

## Larger land, brazier smoke (15 November 2026)

- The scene draws all three named braziers, including the Wash camp, with a plain 40 m smoke column over each. The smoke uses the existing smoke material. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It measures the actual columns and positions from the drawn objects. `git diff --check`: passed.
- For Claude to draw: the final brazier smoke. For Claude to run: the browser scenario and final checks remain for the last round, including the two long drivers.
- Changed assertions: none. Race fingerprints: not checked this round. Codex decided: none.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, brazier map discovery (15 November 2026)

- Both maps mark the yard brazier from the start. The Halfway Camp and Wash braziers appear after the car comes within 400 m and has a clear view over the ground. Known braziers remain on the maps for the job. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It checks the range, a real blocked view, discovery and the marks drawn on both maps. `git diff --check`: passed.
- For Claude to draw: the final smoke and Cinder figure. For Claude to run: the requested scenario and final checks remain for the last round, including the two long drivers.
- Changed assertions: none. Race fingerprints: not checked in this round. Codex decided: none.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, out-pot direction (15 November 2026)

- When the ember is out, an arrow at the screen edge points toward the nearest known brazier and shows its distance in metres. It turns with the car and uses the same knowledge as the maps. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It checks the nearest known place, distance, direction, screen edge and a turn of the car. `git diff --check`: passed.
- For Claude to draw: the final smoke and Cinder figure. For Claude to run: the requested scenario and final checks remain for the last round, including the two long drivers.
- Changed assertions: none. Race fingerprints: not checked in this round. Codex decided: none.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.


## Larger land, barricade positions (15 November 2026)

- The two Ash Men barricades stand at the Halfway Camp and on the Girder Bridge deck. Plain boxes mark them, and the job's own solid grid stops a car at each. The bridge barricade leaves the river bed clear beneath it. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It reads the job positions and actual job solids, checks both named places and their floors, and checks the bridge bed is clear. `git diff --check`: passed.
- For Claude to draw: the final barricades, smoke and Cinder figure. For Claude to run: the requested scenario and final checks remain for the last round, including the two long drivers.
- Changed assertions: none. Race fingerprints: not checked in this round. Codex decided: none.
- Removed: the former barricade positions between the camp and town. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: riders, burning and the remaining numbered steps. The plain barricades do not yet disappear when burned; that belongs to step 3d.

## Larger land, waiting vehicles (15 November 2026)

- One Ash Men vehicle now waits near each barricade, on the ground or bridge deck. This is the first part of step 3b: the vehicles do not yet pursue or ram the player.
- `node tools/test-everburn-job1.mjs`: passed. It initializes the real job mode and checks both vehicles, their distance from the barricades, floor height and clearance from existing solids. No sound event was added.
- For Claude to draw: the final barricades, smoke and Cinder figure. For Claude to run: the requested scenario and final checks remain for the last round, including the two long drivers.
- Changed assertions: none. Race fingerprints: not checked this round. Codex decided: none.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, rider pursuit started (15 November 2026)

- A waiting Ash Men vehicle starts pursuing the loaded pot when the car comes within 120 m of it. It follows the land's floor and solid checks. A rider keeps chasing after the car leaves that range. This is part of step 3b: the rider does not yet ram or jolt the pot. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real world-job step checks that a rider waits before loading, moves toward a nearby loaded pot and leaves the other rider waiting. `git diff --check`: passed.
- Codex decided: 120 m is the initial pursuit range, subject to Claude's review and the scripted drives.
- For Claude to draw: the final barricades, smoke and Cinder figure. For Claude to run: the browser scenario and final checks remain for the last round, including the two long drivers.
- Changed assertions: none. Race fingerprints: not checked this round.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: rider rams and jolts, the scoop ambush, and the remaining steps.

## Larger land, rider rams (15 November 2026)

- A pursuing rider that reaches the car on the same floor shoves it and jolts the ember. The impact goes through the existing ember rule, including Easy scaling and the `world.ember.spark` cue. The rider must separate from the car before another ram.
- `node tools/test-everburn-job1.mjs`: passed. The real world-job step checks the shove, ember loss, cue and one jolt for continued contact. `git diff --check`: passed.
- Codex decided: the ember impact is half the rider's measured approach speed, and contact resets after 8 m of separation. Claude should review this tuning during the scripted drives.
- For Claude to draw: final barricades, smoke and Cinder figure. For Claude to run: the browser scenario, final checks and both long drivers remain for the last round.
- Changed assertions: none. Race fingerprints: not checked this round. Removed: nothing.
- Still to build: the scoop ambush, burning, turn-back, yard placement and the remaining steps.

## Larger land, camp scoop ambush (15 November 2026)

- Beginning a scoop at Halfway Camp sends its waiting rider toward the car, even outside the normal pursuit range. The yard scoop does not call that rider. The existing nearby pursuit remains in place. No new sound event was added; rams use `world.ember.spark`.
- `node tools/test-everburn-job1.mjs`: passed. The real job update checks the trigger before the three-second scoop finishes, the yard scoop and the other rider. `git diff --check`: passed.
- For Claude to run: the scenario and final checks, including the two long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none.
- For Claude to draw: final barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: burning, turn-back, yard placement and the remaining steps.

## Larger land, burning barricades (15 November 2026)

- The lent flamethrower burns each named barricade. A burnt barricade disappears, stops blocking the car and cannot be hit again. Ordinary projectile hits do not burn it. The flame uses the existing `weapon.flame.start` and `weapon.flame.loop` cues; no new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The test fires the real flamethrower at both barricades and checks the job state, solid grid and hit targets. It also checks that an ordinary hit does not burn one. `git diff --check`: passed.
- For Claude to draw: final barricades, smoke and Cinder figure. For Claude to run: the requested browser scenario and final checks, including the two long drivers, remain for the last round.
- Changed assertions: none. Race fingerprints: not checked this round. Codex decided: none.
- Removed: burnt barricades are removed from the job's drawing, solid grid and hit targets. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the turn-back at Tin Town, yard placement and the remaining steps.

## Larger land, Tin Town's safe approach (15 November 2026)

- A loaded car within 400 m of Tin Town's gate and its fence sends both Ash Men riders back to their posts. They do not resume pursuit if the car leaves. Auntie Solder explains why once. Her caption uses the existing radio click; no new sound cue was added.
- `node tools/test-everburn-job1.mjs`: passed. The real job step checks the 400 m boundary, both riders moving toward their posts, the one-time line and no resumed pursuit. `git diff --check`: passed.
- Codex decided: the gate and its two fence sections are the wall used for the distance, including the gate opening. Claude should review the line and measurement.
- For Claude to draw: final barricades, smoke and Cinder figure. For Claude to run: the requested scenario and final checks, including the two long drivers, remain for the last round.
- Changed assertions: none. Race fingerprints: not checked in this round.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: yard placement and the remaining steps.

## Larger land, yard drawing (15 November 2026)

- Hot Delivery requests the Scrapdome yard. The scene draws it on the land's ground and releases its meshes and textures with the scene. Other jobs do not show it. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The test checks the real scene for one yard with two meshes, its position, absence in another job and disposal after switching jobs.
- For Claude to run: the browser scenario and final checks remain for the last round, including the two long drivers. Race fingerprints were not checked this round.
- For Claude to draw: final barricades, smoke and Cinder figure. Changed assertions: none. Codex decided: none.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: yard solids, the gate start and the remaining steps.

## Larger land, yard solids (15 November 2026)

- Hot Delivery's own solid grid now holds every wall, tower, post, dome and mast from the yard drawing's plan. The solids follow the ground. Other jobs do not receive them. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It compares the real job grid with every shape in the plan and drives the real car into a wall and a gate tower and through all six road openings. `git diff --check`: passed.
- For Claude to run: the requested browser scenario and final checks remain for the last round, including the two long drivers. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none.
- For Claude to draw: final barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the gate start and the remaining steps.

## Larger land, start at the yard gate (15 November 2026)

- Hot Delivery starts 40 m inside the east gate, facing out along its bearing. The yard brazier stands 8 m inside and 7 m left of the gate centre. Cinder stands beside it, clear of the road. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It measures the start, heading, Cinder and brazier against the real yard plan and checks clearance using the job's yard solids. `git diff --check`: passed.
- Changed assertions, for Claude to review: the yard brazier's distance from the yard centre changed from at most 9 m to its gate-relative position; the start changed from 40 m west of the yard centre and heading p/2 to 40 m inside the gate and heading 1.0309944553390455 radians. Reason: the start moved to the yard's gate. The pickup's former position beside the yard centre moved to the gate for the same reason.
- Codex decided: Cinder stands 2 m farther left than the brazier, so the figure and fire do not overlap. The brazier is at the specified 7 m offset; Claude should review the figure's placement.
- For Claude to draw: final barricades, smoke and Cinder figure. For Claude to run: the requested scenario and final checks, including the two long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Removed: the open-ground start west of the yard centre. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the furnace and remaining steps.

## Larger land, furnace watch position (15 November 2026)

- The job's furnace sighting and sight rule now use a named watch on a mesa north of the Steps. The watch is about 855 m from the crossing and its ground is about 40 m above the crossing. This is the first part of step 4a. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It checks the actual sighting, named watch, direction and ground height. `git diff --check`: passed.
- Codex decided: use the existing mesa west and north of the Steps for the furnace watch. Claude should review it during the drive and the later cover work.
- For Claude to run: the requested browser scenario and final checks, including the two long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. For Claude to draw: final barricades, smoke and Cinder figure.
- Removed: the former furnace watch between the road barricades. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the horn and two riders after six seconds in sight, then the remaining steps.

## Larger land, furnace horn (15 November 2026)

- The furnace sounds its own `world.furnace.horn` cue after more than six uninterrupted seconds with the car in sight. Losing sight resets the count, and the horn sounds once per job. This is part of step 4a; the two responding riders are not yet built.
- `node tools/test-everburn-job1.mjs`: passed. The real job step checks sight over the land, the reset, the six-second boundary and the one-time cue. `git diff --check`: passed.
- For Claude to run: the requested scenario and final checks, including the two long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none. For Claude to draw: final barricades, smoke and Cinder figure.
- Removed: the former `arena.toll-gate` warning cue for this furnace watch. The old `everburn-play` scenario still needs replacement or removal.
