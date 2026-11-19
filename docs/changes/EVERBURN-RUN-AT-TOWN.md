# EVERBURN-RUN-AT-TOWN

Built by a Sonnet helper for Claude, 11 November 2026. Switch: `story-everburn` (still off). The design is the card's
(`docs/board/cards/EVERBURN-RUN-AT-TOWN.md`); this note lists what was built, what moved and what differs from the card.

## What changed

- `src/world/jobs/everburn.js`: the furnace's path is the card's table: 18 places in place of 16, with Tin Town's gate
  (`tin-town-gate`, 575, 62) after the planes and the road home through (430, 70), the safe road (230, 150) and (0, 230).
  The three legs begin at places 0, 7 and 16. The chase actor now carries `gateWaypoint` (the gate's place in the list)
  beside `legs`. The path is 3,250.6 m, 3 minutes 52 seconds at the base pace (the comment above it says so). The chase's
  line on screen is "Stop the furnace before it reaches Tin Town. Hit a door while it glows." Its opening lines are
  `old-smoke.2`, `old-smoke.4`, `cinder.23`. Job 1 has `sayNear` (the furnace on the skyline), job 3 has `closing`
  (Cinder's sighting line) in place of its old won line, job 4 has `sayAtShare` (Moss's line).
- `src/world/jobs/old-smoke.js`: `createFurnace` reads `gateWaypoint` and keeps `townReached` and `gateBurnt` in the
  furnace's state. `passTheGate` sets them once, the first time the run along the path reaches the gate (at any pace,
  also at the bolt pace): `gateBurnt` only when the right door (leg index 1) is not yet broken. Events `townReached`
  (carries `burnt`) and `gateBurnt`. Without `gateWaypoint` there are no gate facts. No randomness; no other rule moved
  except the opening length below.
- `src/arena/modes/world-job.js`: cues for the two new events; the callouts for the two Auntie Solder lines;
  `worldJob.gateBurnt` remembers the fire for the rest of the job (a wreck starts the chase again with a new furnace);
  `worldJob.wonAtSec` notes when a step's closing lines began (job 3's catch); the escort actor's share of her road is
  passed to the job engine for `sayAtShare`.
- `src/world/jobs/step-lines.js`: `afterStartLineId` may be a list; a new `sayAtShare` trigger plays a line once when the
  step's actor has gone a share of its road.
- `src/world/jobs/steps/chase.js`: a catch stays a catch (`state.caught`). See "Differs from the card".
- `src/world/jobs/furnace-sightings.js` (new): where the furnace stands in jobs 1, 3 and 4, worked out from the job's own
  state and clock, and `pathShare`. Pure numbers; the scene reads it.
- `src/world/scablands-scene.js`: Tin Town's gate fire (three tongues about 3 m tall from `createFlameMaterial` and a
  plume of eight smoke puffs from `createSmokeMaterial`), shown while the furnace's state or the job says the gate
  burnt; and the furnace rig placed at its sighting (no door fire, chimney smoke and wheels as when it moves).
- `src/story/ember-lines.js`: the seven new lines, word for word; `story.ember.cinder.17` removed.
- `tools/test-old-smoke.mjs`, `tools/test-ember-lines.mjs`, `tools/test-scablands-scene.mjs`: the card's checks 1, 3, 4.

## Differs from the card

- **Line id `story.ember.cinder.24`, not `.21`, for the job 1 sighting.** `story.ember.cinder.21` already exists ("I'm
  with you now, if you'll have me...", Job 6 won), so the card's id would have overwritten it. The other six ids are the
  card's. Rename if you want a different number.
- **The chase's opening is longer: `OLD_SMOKE.introSec` 4.5 to 6.7 seconds.** The chase now opens with three lines
  (6.6 seconds). With the old 4.5 the first stoke would have begun in the middle of Cinder's third line, and on Easy
  the door arrow would have replaced it on screen. This moves the first door's stoke 2.2 seconds later on every
  difficulty; nothing else in the rules moved. Revert by setting it back to 4.5 and dropping a line.
- **Job 3: the job holds for Cinder's sighting line, and a catch now stays a catch.** The job ended in the same moment
  as the catch, so no caption and no 20 seconds of rolling furnace could ever be seen. Job 3 now uses the engine's
  `closing` list (it holds about 2.2 seconds for the line), and `chase.js` keeps a catch once made, so that a thief who
  rolls out of reach during that second cannot undo it. The old job 3 won line, `everburn-job-3-won`, had no words
  behind it (the screen would have shown the raw id, the fault on card QA-EVERBURN-SCREENS) and is gone.
  The furnace's 20 seconds of rolling are drawn as the card says, from the catch; the player sees about the first 2 of
  them before the result screen comes. To show more, the hold has to be longer (a card for Claude).
- **Gate fire stays through a wreck.** The scene reads `worldJob.gateBurnt` as well as the furnace's own fact, because a
  wreck starts the chase again with a new furnace that has not yet passed the gate.
- **Path clearance check exempts the well's own box for the first and last pieces.** The furnace starts at the well and
  falls into it, so those two pieces end inside the Everburn well's box by design. Every other piece, and those two
  against every other box, clear by 8 m. The tightest clearance is 15.1 m; no place was moved.

## Seen before fought: how the three sightings are worked out

- Smaller z is north in the Scablands (the Ridge and the Dry Dam are at z = -304, the north gate of the Scrapdome at
  z = -205, the Mall at z = 430), so "150 m to the north" is z - 150.
- **Job 1** (`definition.number` 1): standing at (300, -120), facing south toward the road, until the job is done.
  Cinder's line comes from the job's own `sayNear` (260 m from that spot).
- **Job 3**: the job engine's closing lines start in the tick of the catch, and `worldJob.wonAtSec` notes that moment
  from `worldJob.clockSec`. From it the furnace rolls from (140, 470) toward (-60, 440) in 20 seconds, then is hidden.
- **Job 4**: Big Bess's share of her road is read from her own position and `pathIndex` (the road is 646.9 m; her
  actor's `pathProgress` only steps through 0, .5 and 1). Between 30% and 70% the furnace is at her x and her z - 150
  with her heading. Past 70% it keeps that place, turns to face north over 30 m, goes on north at its own 14 m/s
  while she drives at 9, and is hidden after 220 m. All of it comes from her place on the road, not from a timer, so
  the same inputs give the same picture, and if her road restarts from a marker the sighting starts again.
  Moss's line comes from the new `sayAtShare` trigger at 30%.
- Before a sighting starts and in every other job the furnace stays where it stood in the Everburn. No furnace actor
  stands behind any sighting (the scene test checks it).

## Re-recorded numbers

| Where | Was | Now | Why |
| --- | --- | --- | --- |
| `OLD_SMOKE.introSec` | 4.5 s | 6.7 s | three opening lines, see above |
| `tools/test-old-smoke.mjs`, the slam and horn check: wait for the first slam | 14 s, limit 20 | 16 s, limit 24 | the first stoke is 2.2 s later |
| `tools/test-ember-lines.mjs`: captions | 34 | 40 | seven new, one removed |
| Furnace path length and time | 3,150 m, 3 min 45 s | 3,250.6 m, 3 min 52 s | the new places; the checks' own bounds (200 to 250 s, the Hard escape 200 to 260 s) still hold |
| Rear door ground | about 230 m | 228.7 m | the place (-200, 350) is kept |

No other pinned length, time, waypoint index or count moved: the places 0 to 10 keep their indexes (the Boneyard slice
7 to 10 still holds), so the checks that read them are unchanged. `tools/test-everburn-easy.mjs` needed no change.
No tolerance was loosened and no behaviour check removed.

## Checks

- `node tools/test-old-smoke.mjs`: 480 checks (438 before). New: the path, the legs and the gate's place; the clearance
  of every piece from every solid; the gate facts on every difficulty (burns with the right door whole, stays whole with
  it broken, left door only still burns, once however many laps, not mended by later hits, no facts without
  `gateWaypoint`, same facts every time); the gate's cues and lines in a real Duel; the chase's three opening lines in
  order; job 3's catch, hold and end. The young driver on Easy won 10 of 10 chases (the check wants 8).
- `node tools/test-everburn-easy.mjs`: all nine jobs finish through real inputs, 10 of 10 each, job 6 included.
- `node tools/test-ember-lines.mjs`: 40 captions and the note; the new ids and places, the removed line, the chase's
  line order, and the three sighting lines each playing once (job 1 at 233 m but not at 270 m, job 3 at the catch with
  the hold, job 4 at 31% but not 29%).
- `node tools/test-scablands-scene.mjs`: the gate fire is hidden until `gateBurnt`, three tongues about 3 m tall, on the
  gate, with smoke, and stays through a wreck; the furnace in jobs 1, 3 and 4 at the card's places and times, not an
  actor, no door fire, gone when the card says.
- Also run: `test-ember-save` (53), `test-ember-screens` (23), `test-feature-flags` (129), `test-ships-lines` (90),
  `test-town-world` (6), `test-world-job-mode`, `test-iron-line` and `test-blender-output` (397): pass.
- Lane tier (`--changed --jobs 4`): 68 passed, 0 failed. `npm run build`: pass. Browser check `everburn-well`: pass
  (2 screenshots, 0 warnings, 0 errors).
- Not run here (Claude, on the laptop): the `everburn` browser check; driving job 6 by hand on Easy and
  Medium and watching the three sightings.

## Sound

- `townReached`: `arena.toll-gate`, the horn that already warns of the shove. Once.
- `gateBurnt`: `weapon.flame.start`, the flamethrower's flame catching. The Everburn has no fire-catch cue for its
  burning loads, so this is the nearest existing fire cue. Once, after the horn.
- Sightings: no new sound; the lines are captions as before.

## Removed

The loop: the places `furnace-turn-1`, `furnace-turn-2`, `furnace-run-1` and `furnace-run-2`, and the line
`story.ember.cinder.17`. Also the job 3 won line id `everburn-job-3-won`, which had no words, and the chase step's
old line "Break the furnace's three doors."
