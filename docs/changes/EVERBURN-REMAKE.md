# EVERBURN-REMAKE, slice 1: the ember and the ground

## Larger land, proof drive through the yard gate (15 November 2026)

- The seeded Medium proof drive now continues from Cinder through the actual east gate with the ember alight. This is part of step 7a; the East Road arrival and its ember band still need proof. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real car crosses within the 12 m opening and travels at least 20 m beyond it. `git diff --check`: passed. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: the proof driver aims 45 m beyond the gate and keeps below 14 mph while leaving, pending the full route drive.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival and the other proof drives, camera, cover and scenario.

## Larger land, pause screen (15 November 2026)

- The Hot Delivery pause screen names the job and the Scablands, both during and between steps. Other jobs keep their existing description. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real pause screen checks both descriptions and another job; the existing Pipe landing and river-bed checks also pass. `git diff --check`: passed.
- Changed assertions: none. Race fingerprints: not checked this round. Codex decided: none.
- For Claude to run: the browser scenario and final checks remain for the last round, including both long drivers. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the map, scripted drives, camera, cover and scenario.

## Forge bay stop (15 November 2026)

- Hot Delivery now ends with the loaded car stopped within 6 m of the existing cold-forge place, rather than on reaching the town centre. The ember must be alight. The arrival event carries the grade and pay, including the relight cap. No new sound event was added; the forge's `world.forge.catch` belongs to step 5c.
- `node tools/test-everburn-job1.mjs`: passed. The real job step checks the bay, a moving car, a player on foot, all three pay bands, the relight cap and an out ember. The bay centre is clear in the job solid grid. Race fingerprints were not checked in this round.
- Changed assertions, for Claude to review: the loaded HUD target changed from `tin-town` to `cold-forge` because the destination is now the forge bay.
- Codex decided: use the existing cold-forge place as the centre of a 6 m bay and the existing stopped threshold of under 1 km/h. Claude should review the bay on the hand drive.
- For Claude to draw: the forge and bay, final gate door, barricades, smoke and Cinder. For Claude to run: the browser scenario, final checks and both long drivers remain for the last round.
- Removed: finishing on entry to the town centre. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the visible pot transfer and forge fire, then the remaining steps.

## Tin Town gate door (15 November 2026)

- Hot Delivery has a plain solid door across Tin Town's entrance. A car approaching below 30 km/h swings it aside and clears its job-only solid. The opening uses `world.tintown.gate` once. Other jobs retain their open entrance.
- `node tools/test-everburn-job1.mjs`: passed. The real job update checks the speed boundary and cue; the scene and solid grid show the closed and open door. `git diff --check`: passed.
- For Claude to draw: the final Tin Town gate door, barricades, smoke and Cinder. For Claude to run: the browser scenario, final checks and both long drivers remain for the last round.
- Changed assertions: none. Race fingerprints were not checked in this round. Codex decided: the plain door swings aside immediately when requested; Claude should review its appearance and timing.
- Removed: Hot Delivery's permanently open entrance. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the forge bay and remaining steps.

## Tin Town gate approach (15 November 2026)

- Hot Delivery requests the gate when the player is in the car within 20 m and travelling below 30 km/h. The request sounds `world.tintown.gate` once. This is the first part of step 5a: the entrance has no gate door yet, so nothing opens or blocks the car.
- `node tools/test-everburn-job1.mjs`: passed. The real job update checks distance, the 30 km/h boundary, being on foot and the one-time sound. `git diff --check`: passed.
- Codex decided: use 20 m as the approach distance. Claude should review it when the gate is drawn and driven.
- Changed assertions: none. Race fingerprints were not checked in this round.
- For Claude to run: the browser scenario, final checks and both long drivers remain for the last round. For Claude to draw: final barricades, smoke, Cinder and the Tin Town gate door.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the gate door, its movement and collision, then the forge and remaining steps.

## River bed at the bridge (15 November 2026)

- The bed way reaches the Wash brazier and bends around the Girder Bridge's centre pier. The car can pass below the deck. No new sound event was added; the scoop uses `world.ember.scoop`.
- `node tools/test-everburn-job1.mjs`: passed. A real car drives to the Wash brazier and scoops, and drives beneath the bridge on the lower floor. The test also checks the route's order. `git diff --check`: passed.
- Codex decided: the bed way passes 20 m from the bridge centre to clear its pier. Claude should review the route during the drive.
- Changed assertions: none. Race fingerprints were not checked in this round.
- For Claude to run: the browser scenario, final checks and both long drivers remain for the last round. For Claude to draw: the final barricades, smoke and Cinder figure.
- Removed: the bed route's line through the bridge's centre pier. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the gate, forge and remaining steps, including complete drives along the ways.

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

Added the same night: `src/world/ash-men-look.js` (`barricadeShape`, standing and burnt, 1,536 and 936 triangles, wearing the
yard's corrugated picture) and `src/world/smoke-column.js` (`createSmokeColumn`, one sheet drawn by its own shader, 40 m tall).
The yard's file now shares its building pieces (`scrapBuilder`). Nothing calls either yet; Codex places them. Seen on a test
page only. No test added, no assertion changed, no sound.

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

## Larger land, Pipe landing (15 November 2026)

- The Pipe's sideways slide now leaves flight and landing to the Scablands ground rules. The fall produces one landing hit and jolts the pot. The existing landing and `world.ember.spark` cues apply.
- `node tools/test-everburn-job1.mjs`: passed. The real car stays on at 35 km/h; at 50 km/h it leaves the deck, lands once after a fall over 2 m and loses ember. `git diff --check`: passed.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none. For Claude to draw: final barricades, smoke and Cinder figure.
- Removed: the competing knock-flight update for this Pipe slide. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the bed route and remaining steps.

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

## Larger land, furnace riders (15 November 2026)

- The horn sends two Ash Men vehicles from the furnace watch after the car has been in sight for more than six seconds. They pursue and ram using the existing rider rules, and turn back at Tin Town. The horn uses `world.furnace.horn`; a ram uses `world.ember.spark`.
- `node tools/test-everburn-job1.mjs`: passed. The real job step checks that no riders appear before the horn, exactly two appear, and both descend from the watch and pursue the car. `git diff --check`: passed.
- Codex decided: the riders start 6 m either side of the furnace watch and use the existing Ash Men vehicle and pursuit speed. Claude should review their approach in the scripted drives.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. For Claude to draw: final barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the salt pan and remaining steps.

## Larger land, salt pan wind (15 November 2026)

- The salt pan cools Hot Delivery's ember 50% faster than ordinary ground. The world-job update reads the actual ground region; the extra cooling does not change rough-ground or impact loss. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real world-job update compares one second on the salt pan and ordinary ground. `git diff --check`: passed.
- Codex decided: use a cold factor of 1.5, as the starting value for the six scripted drives. Those drives must check the arrival bands and may require tuning.
- For Claude to draw: final barricades, smoke and Cinder figure. For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: the Pipe, river bed and remaining steps.

## Larger land, Pipe speed detection (15 November 2026)

- Hot Delivery now detects when the car is on the Pipe's deck and travelling faster than 40 km/h. It uses the named crossing, the Salt Road's direction, the deck's width and the car's own floor. This is part of step 4c: the car does not yet leave the deck when it goes too fast. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real world-job update checks 40 and 41 km/h, the river bed below the deck and another road. `git diff --check`: passed.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none. For Claude to draw: final barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
- Still to build: make the fast car leave the Pipe and take the fall as a hit, with a scripted drive at each speed, then the remaining steps.

## Larger land, Pipe slide (15 November 2026)

- A car going over 40 km/h on the Pipe starts sliding toward its nearer edge using the existing car shove. It is not pushed again until it has left the deck. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real car stayed within 3.6 m of the centre at 35 km/h; at 50 km/h it moved over 12 m sideways and more than 3 m above the ground. The job update also checks the 40 and 41 km/h boundary. `git diff --check`: passed.
- Still to build: the fall must produce a landing hit. In this drive the car left the deck but no `scablandsHit` landing event was observed. Then finish the bed route and remaining steps.
- Codex decided: the slide starts at 18 m/s sideways toward the nearer edge. Claude should review how it feels.
- Changed assertions: none. Race fingerprints: not checked in this round.
- For Claude to draw: final barricades, smoke and Cinder figure. For Claude to run: the browser scenario and final checks, including the two long drivers, remain for the last round.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.
## Larger land, forge catch cue (15 November 2026)

- On delivery, Hot Delivery records the ember and its grade for the forge and plays `world.forge.catch` at the bay. This is part of step 5c; the pot transfer and visible forge fire still need to be built.
- `node tools/test-everburn-job1.mjs`: passed. The real world-job update checks bright and weak deliveries, the recorded fire and one cue at the bay. `git diff --check`: passed.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: none. For Claude to draw: final barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, forge fire (15 November 2026)

- The cold forge now shows a plain flame after delivery. A bright ember catches faster and burns higher than a weak one. The existing `world.forge.catch` cue sounds on delivery. The completed carry step removes the pot from the car.
- `node tools/test-everburn-job1.mjs`: passed. It delivers bright and weak embers through the real job, then checks the actual scene flame, its position and growth. `git diff --check`: passed.
- For Claude to draw: the final forge fire, barricades, smoke and Cinder figure. For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: the bright flame grows over two seconds and the weak flame over eight seconds, pending Claude's drive.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: a visible pot transfer, the remaining screen, drive, camera, cover and scenario steps.

## Larger land, pot transfer (15 November 2026)

- At delivery a plain pot lifts from behind the stopped car and moves to the forge over two seconds. The existing forge fire and `world.forge.catch` cue remain. The carried pot is removed when the carry step ends.
- `node tools/test-everburn-job1.mjs`: passed. The real job and scene check the pot's movement, lift and arrival for bright and weak embers. `git diff --check`: passed.
- For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure. For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: the plain transfer takes two seconds, pending Claude's drive.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the screen, drives, camera, cover and scenario steps.

## Larger land, race readouts (15 November 2026)

- World jobs hide the race clock, style points and jump readout. These return outside a world job. This is part of step 6a; the weapon bar still needs to show only the lent flamethrower. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real screen checks the three readouts in a job and their return afterwards. `git diff --check`: passed.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: the race clock, style points and jump readout from world-job screens. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, world-job weapon bar (15 November 2026)

- The world-job weapon bar shows only the lent flamethrower, in its actual slot. When there is no flamethrower on loan it shows no car weapons. The normal weapon bar returns outside a world job. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real combat screen checks loans in the first and fourth slots, no loan, and the return to the normal bar. `git diff --check`: passed.
- Changed assertions: none. Codex decided: none. Race fingerprints were not checked in this round.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: other car weapon slots from world-job screens. The old `everburn-play` scenario still needs replacement or removal. Still to build: the pause screen, map, drives, camera, cover and scenario. The Pipe landing hit also remains unfinished.

## Larger land, map at the start (15 November 2026)

- Hot Delivery's large map begins with “What you know”, the East Road and Cinder's warning that the Ash Men hold the Girder Bridge. It does not list or draw the other route lines or disclose their dangers. The route is calculated to Tin Town even before pickup. This is the first part of step 6c; discovering other routes and dangers remains to be built. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The test reads the map's real route descriptions and list markup and checks the starting words and hidden routes. `git diff --check`: passed.
- Changed assertions: none. Codex decided: none. Race fingerprints: not checked this round.
- For Claude to run: the browser scenario and final checks remain for the last round, including both long drivers. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: the initial list of all four routes and their unearned danger descriptions from Hot Delivery's map. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, seeing a crossing (15 November 2026)

- Seeing a crossing within 400 m adds its way and length to Hot Delivery's map. The map draws discovered ways as well as the East Road. This is part of step 6c; driving 300 m of a way and recording dangers remain to be built. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It checks the real route and land crossing, discovery, the list and length, and that discovery is retained. `git diff --check`: passed.
- Codex decided: a crossing is visible within 400 m with clear sight, matching brazier discovery. Claude should review the distance.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. Race fingerprints were not checked this round.
- Changed assertions: none. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal.

## Larger land, driving a way (15 November 2026)

- Driving 300 distinct metres near a Hot Delivery way adds it to the large map. Repeated travel over the same stretch and position jumps do not count twice. This is part of step 6c; recording dangers remains. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The test follows the real plates way, checks repeated travel and the discovery threshold, and checks a position jump. The existing Pipe landing test also passed. `git diff --check`: passed.
- Codex decided: count travel within 30 m of the mapped line and ignore steps over 50 m. Claude should review these distances during the drive.
- Changed assertions: none. Race fingerprints: not checked this round.
- For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure. For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: map dangers and captions, the six drives, camera, cover and scenario.

## Larger land, dangers on the map (15 November 2026)

- Hot Delivery's map lists barricades and the furnace after the job's map knowledge records them. Unknown dangers stay off the list. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The test uses the job's real barricade and furnace facts and the map's knowledge and markup. `git diff --check`: passed.
- Changed assertions: none. Codex decided: none. Race fingerprints were not checked in this round.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: other dangers, map captions, the six drives, camera, cover and scenario.

## Larger land, salt wind and Pipe on the map (15 November 2026)

- The map records the salt pan wind when the car reaches the pan and the Pipe's speed limit when the car reaches its deck. Both stay on the list afterwards. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real job update supplies the Pipe deck state; the test checks both dangers are hidden beforehand, appear when met and remain afterwards. `git diff --check`: passed.
- Changed assertions: none. Race fingerprints: not checked this round. Codex decided: none.
- For Claude to run: the requested browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: map captions, six drives, camera, cover and scenario.

## Larger land, captions on the map (15 November 2026)

- A job caption stays visible when the map pauses the game and sits at the map's lower edge. It returns to its original place when the map closes. Ordinary pause still hides it. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real screen checks the caption during map pause and ordinary pause; the map caption's move and return are checked. `git diff --check`: passed.
- For Claude to run: check the caption's placement in the browser scenario, then run the final checks and both long drivers. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: the caption's position across the middle of the open map. The old `everburn-play` scenario still needs replacement or removal. Still to build: the six drives, camera, cover and scenario.

## Larger land, scripted drive opening (15 November 2026)

- Added the shared opening for the Medium proof drives. From the real yard start, the car drives to Cinder, stops and waits for the pot. This is the first part of step 7a; it does not yet drive the East Road or prove an arrival band. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real seeded game drives to the pickup and checks that the pot is loaded with more than 99 ember. `git diff --check`: passed.
- Changed assertions: none. Codex decided: none. Race fingerprints were not checked in this round.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road drive and its arrival band, the other five drives, camera, cover and scenario.

## Larger land, first stretch of the East Road proof drive (15 November 2026)

- The Medium proof driver now follows the real East Road for its first 500 m. It leaves the yard more slowly to avoid a damaging jolt while turning away from Cinder. This is part of step 7a, not an arrival proof. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. At the gate the ember was 96.81; at 500 m along the road it was 92.99, and the car stayed within 3.12 m of the road line. `git diff --check`: passed.
- Changed assertions: none. Codex decided: the scripted driver uses 4 mph inside the gate and follows a point 45 m ahead on the road. Race fingerprints were not checked in this round.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the rest of the East Road drive and its arrival band, the other five drives, camera, cover and scenario.

## Larger land, one kilometre on the East Road (15 November 2026)

- The Medium proof drive now continues to 1 km along the East Road. The driver records the real car's distance travelled and peak speed, so the test checks that it drove the next stretch at a steady speed. The ember measured 88.55 at 1 km. This is part of step 7a, not an arrival proof. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. `git diff --check`: passed. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the rest of the East Road drive and its arrival band, the other five drives, camera, cover and scenario.

## Larger land, 1.5 kilometres on the East Road (15 November 2026)

- The Medium proof drive continues to 1.5 km along the real East Road. The driver now records the real ember and elapsed time for each stretch, for checking the eventual arrival. The third 500 m took 31.75 seconds and left 84.10 ember. This is part of step 7a, not an arrival proof. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The car travelled 499.87 m on the third stretch and stayed within 20 m of the road. `git diff --check`: passed. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the rest of the East Road drive and its arrival band, the other five drives, camera, cover and scenario.

## Larger land, two kilometres on the East Road (15 November 2026)

- The Medium proof drive reaches 2 km on the East Road. The driver records the lowest real ember seen during each stretch, so the test can detect an ember going out before the end. At 2 km it had 79.73 ember; the fourth stretch took 31.22 seconds and stayed within 1.20 m of the road. No sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. `git diff --check`: passed. Race fingerprints were not checked this round.
- An exploratory drive to 2.5 km did not pass: the car stopped making progress near 2,329 m and the ember went out during the 120-second limit. The cause needs investigation before the arrival proof can continue.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof, the other five drives, camera, cover and scenario.

## Larger land, East Road camp proof (15 November 2026)

- The Medium proof driver uses the loaned flamethrower against a barricade ahead. It burns the Halfway Camp barricade and continues to 2.5 km. No new sound event was added; the existing `weapon.flame.start` cue plays.
- `node tools/test-everburn-job1.mjs`: passed. The real car drove 499.25 m in 32.20 seconds, stayed within 1.25 m of the road and reached 2,500.25 m with 58.40 ember. `git diff --check`: passed. Race fingerprints were not checked in this round.
- Codex decided: the proof driver fires when an unburnt barricade is within 18 m and within the flamethrower's 15-degree half cone. This uses the real weapon and job state. Claude should review the drive.
- Changed assertions: none. For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer, forge fire, barricades, smoke and Cinder figure.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the rest of the East Road arrival proof, the other five drives, camera, cover and scenario.

## Larger land, Cinder model (15 November 2026)

- Cinder uses her crew model at the pickup, 1.7 m tall and facing the start. The temporary figure stays until it loads. After pickup she is hidden when the car is 60 m away. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The scene test uses a stubbed loader and checks the model, height, ground, facing, separation from the brazier and visibility. `git diff --check`: passed. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the browser scenario and final checks remain for the last round, including both long drivers. For Claude to draw: the pot transfer and forge fire.
- Removed: the temporary Cinder figure after her model loads. The old `everburn-play` scenario still needs replacement or removal. Next: the barricade drawing, then the smoke column and remaining steps.

## Larger land, barricade drawing (15 November 2026)

- The two Ash Men barricades use Claude's standing and burnt drawings, with one shared surface. Their fronts face the yard, and burnt barriers remain visible after their solids are removed. The standing drawing is fitted to the solid's depth because its stakes extend beyond the supplied box. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real flamethrower burns both barriers; the test compares the drawn dimensions and placement with the job solids, and checks the burnt drawing and removal of each solid. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: the standing drawing is fitted to the solid's depth; Claude should review the appearance.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: the plain barricade slabs. The old `everburn-play` scenario still needs replacement or removal. Next: the smoke columns, then the remaining proof drives, camera, cover and scenario.

## Larger land, brazier smoke (15 November 2026)

- Each brazier now has Claude's animated 40 m smoke column at its fire mouth. The yard column disappears when the pot is loaded; both camp columns remain. No new sound event was added.
- `node tools/test-everburn-job1.mjs`: passed. It checks the three columns' positions, height, animation and pickup visibility. Race fingerprints were not checked in this round.
- Changed assertions, for Claude to review: the old five-puff geometry bounds ran from the brazier foot to 40 m above it; the new column starts 1.1 m above the foot and has a 40 m shader height. The test now checks the actual fire-mouth position and `uHeight`, because the shader draws the height beyond the mesh's CPU-side bounds.
- Codex decided: none. For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: the five smoke puffs at each brazier. The old `everburn-play` scenario still needs replacement or removal. Next: finish the East Road proof drive, the other five drives, camera, cover and scenario.

## Larger land, East Road camp scoop (15 November 2026)

- The Medium proof driver burns the camp barricade, turns back to the Halfway Camp brazier, stops and takes a scoop, then returns to the road. This advances step 7a; it does not prove arrival at Tin Town. The existing `world.ember.scoop` cue sounds for the scoop. No new game event was added.
- `node tools/test-everburn-job1.mjs`: passed. The real car stopped 6.76 m from the brazier, gained 24.998 ember including the cold loss on that step, and left with 83.03 ember. At 2.5 km it had 81.34 ember. `git diff --check`: passed. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: the proof driver burns the barricade before returning to the brazier. Claude should review the drive.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof, the other five drives, camera, cover and scenario.

## Larger land, East Road beyond the camp (15 November 2026)

- The Medium proof drive continues from the Halfway Camp to 3.5 km along the real East Road. The driver now records the car's actual position at the end of each stretch. This advances step 7a; arrival is not yet proved. No new game event or sound cue was added.
- `node tools/test-everburn-job1.mjs`: passed. At 3 km the ember was 76.90, and at 3.5 km it was 72.46. The latter stretch covered 499.88 m in 31.75 seconds and stayed within 0.01 m of the road. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof, the other five drives, camera, cover and scenario.

## Larger land, East Road to 4.5 kilometres (15 November 2026)

- The Medium proof drive follows the East Road to 4.5 km. The driver records where its peak speed occurred, to help inspect unexpected speed on later stretches. This advances step 7a; it does not prove arrival. No game event or sound cue was added.
- `node tools/test-everburn-job1.mjs`: passed. At 4 km the ember was 67.83; at 4.5 km it was 63.39. The latter stretch took 31.75 seconds and stayed within 1.28 m of the road. The preceding stretch briefly reached 42.05 mph at (3225.87, 297.93); Claude should review this speed in the drive. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof, the other five drives, camera, cover and scenario.

## Larger land, East Road to five kilometres (15 November 2026)

- The Medium proof drive follows the East Road to 5 km. Its driver records which barricades it burns on each stretch; the real flamethrower burns the bridge barricade between 3.5 and 4 km. The existing `weapon.flame.start` cue sounds. No new game event was added.
- `node tools/test-everburn-job1.mjs`: passed. At 5 km the ember was 58.95; the last stretch covered 498.82 m in 31.68 seconds and stayed within 1.51 m of the road. `git diff --check`: passed. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof, the other five drives, camera, cover and scenario.

## Larger land, East Road to 5.5 kilometres (15 November 2026)

- The Medium proof drive reaches 5.5 km on the East Road. Its driver records the closest distance to Tin Town's real gate for the remaining approach. This advances step 7a; arrival is not yet proved. No game event or sound cue was added.
- `node tools/test-everburn-job1.mjs`: passed after confirming the integration branch is already merged. The last stretch covered 499.09 m in 31.53 seconds, stayed within 1.51 m of the road and ended with 54.54 ember, 1,408.76 m from the gate. `git diff --check`: passed. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof, the other five drives, camera, cover and scenario.

## Larger land, East Road town approach (15 November 2026)

- The Medium proof driver can choose a lower road speed for the approach to Tin Town. It follows the road from 5.5 to 6.5 km at a target of 25 mph. No game event or sound cue was added.
- `node tools/test-everburn-job1.mjs`: passed. The real car drove 999.78 m in 86.23 seconds, stayed within 1.82 m of the road and reached 6.5 km with 42.46 ember, 1,003.85 m from the gate. The required bright arrival is not yet proved: this ember is already below 70. The remaining drive and balance need work. Race fingerprints were not checked in this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof, the other five drives, camera, cover and scenario.

## Larger land, East Road to seven kilometres (15 November 2026)

- The Medium proof drive follows the East Road to 7 km. The driver records the real car's speed at its closest point to Tin Town's gate, for the slow gate approach. No game event or sound cue was added.
- `node tools/test-everburn-job1.mjs`: passed. The final stretch covered 497.87 m in 44.10 seconds, stayed within 1.97 m of the road and ended with 36.29 ember, 768.01 m from the gate, at 25.01 mph. The required bright arrival is not yet proved; the ember is already below 70. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: none.
- For Claude to run: the scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof and balance, the other five drives, camera, cover and scenario.

## Larger land, East Road jolt measurements (15 November 2026)

- The proof driver records each pot jolt's actual amount, position and car speed during a road stretch. This makes the loss on the unfinished East Road drive visible. No game event or sound cue was added.
- `node tools/test-everburn-job1.mjs`: passed. The test compares the recorded camp and bridge jolts with the actual pot's jolt count and checks the recorded camp jolt. The camp approach had one jolt of 16.82 ember at (1994.83, 1197.91), at 28.25 mph; the bridge stretch had none. `git diff --check`: passed. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: none. For Claude to run: the browser scenario and final checks remain for the last round, including both long drivers. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the East Road arrival proof and balance, the other five drives, camera, cover and scenario.

## Larger land, East Road gate approach (15 November 2026)

- The Medium proof driver slows for Tin Town and reaches the gate under 30 km/h. The real job opens the gate and removes its solid. This advances step 7a; it does not yet reach the forge or prove a bright arrival. The existing `world.tintown.gate` cue plays. No new game event was added.
- `node tools/test-everburn-job1.mjs`: passed. At 7.6 km the ember was 28.87; at 7.81 km the car was 6.35 m from the gate, travelling 26.16 km/h, with 24.97 ember. The required bright arrival remains unproved and this drive needs balance work. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: the proof driver starts slowing within 200 m of the gate, aiming for 16 mph. Claude should review the drive.
- For Claude to run: the browser scenario and final checks, including both long drivers, remain for the last round. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the forge arrival and East Road balance, the other five drives, camera, cover and scenario.

## Larger land, East Road forge arrival (15 November 2026)

- The Medium proof driver drives through Tin Town's open gate and stops in the real forge bay. The job completes and the existing `world.forge.catch` cue plays. This advances step 7a, but does not prove the required bright arrival.
- `node tools/test-everburn-job1.mjs`: passed. The car stopped 4.90 m from the bay centre at 0.58 mph, with 6.46 ember, graded barely. Race fingerprints were not checked this round.
- Changed assertions: none. Codex decided: the proof driver aims directly for the bay at up to 10 mph and brakes within 5 m. Claude should review the drive.
- For Claude to run: the browser scenario and final checks remain for the last round, including both long drivers. For Claude to draw: the pot transfer and forge fire.
- Removed: nothing. The old `everburn-play` scenario still needs replacement or removal. Still to build: the bright East Road arrival and balance, the other five drives, camera, cover and scenario.
