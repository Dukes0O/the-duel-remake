# WORLD-FAULTS-18-NOV

Kyle's try of 18 November 2026 on the Scablands (jobs 2 and 3 of the Everburn, the frozen build of 728166901). The story
is being redesigned (STORY-CHOICES), but these are faults of the world, and any story is played in it. Codex's card.

**Rule for this card: measure first.** For each finding, step the real Duel headless (or read the scene's own numbers)
until the fault is shown in numbers, write the cause with file and line on this card, and only then cure it. Two causes
written down from play on 17 November were wrong. Thirty minutes at most on each; what is not found is reported with what
was ruled out. Cure only what is a fault of the world; a number that is a design choice is listed for Claude.

## The findings (Kyle's words are on EVERBURN-REMAKE, "Kyle's try of job 3")

1. **Ground and the crash sound.** Slice 15 part A changed ground-only stops to the landing thump. Confirm with a check
   that the same holds on the Boneyard road and on the way out of Tin Town.
   Then finish that cure: `src/sim-driving.js` and `src/sim-scablands.js` still ask for `world.ground.scab-plates` and
   `src/audio.js` renames it. The rules ask for the landing thump by its own name, and the old cue leaves the bank.
2. **Tin Town's gate.** A car driving out through the gate's opening (9 m wide) is slowed or held with nothing in front of
   it. Measure the solids the gate and its fence give the grid (`src/world/tin-town-gate.js`, `tinTownGateSolids`) against
   what is drawn: every solid must lie inside its drawn thing, as the Boneyard's wrecks now do. Then drive a car through
   the opening headless at 20, 40 and 60 km/h and show it is not touched.
3. **The thief's car is drawn sideways.** The car of the bellows thief stands across its direction of travel
   (`src/world/jobs/bellows-rule.js`, the thief's heading, and where the scene turns the model). Show its drawn heading
   against its velocity, then cure whichever is wrong.
4. **The car under the ground.** On the east road the car was drawn under the ground where the ground's kind changes
   (rock under sand). Find the place (walk the road's line and compare, every 2 m, the height the car is given with the
   height of every ground layer drawn there), then cure the layer or the height so that nothing drawn is above the road's
   surface under a car.
5. **The player is moved without warning.** Twice the car was set down somewhere else: nearing the Boneyard, and when the
   thief reached the furnace. Find every place where job 3 or the world job mode sets the player's position after the
   start (search for `placeActor`, recovery poses and the bellows rule's own moves) and list each with its reason. Claude
   then rules which may stay. A player is never moved without a line on screen that says why.
6. **Cars that meet do not crash.** The player's car and an Ash rider's car "bonk" with no sound and no damage. Show what
   a contact between them does today (speeds, damage, sound request) against a contact between two cars in an arena.
7. **Weapons on the road.** The car's crossbow fired at the thief's car misses at any range. Show the bolt's line against
   the target for a car 30 m dead ahead in a world job, and against an arena target.
8. **A man on foot can be driven through.** The thief standing by his car has no solid and takes no hit from a car.
9. **Mouse and aim drift apart** on foot (the app's browser pane, no pointer lock at first). Read `src/app.js` where the
   mouse's movement is clamped (300 a move) and `src/onfoot.js` `applyFootLook`. Show whether movement is lost when the
   pointer leaves the canvas or is clamped, and say what a player would have to do to make it happen. Report; the cure
   may touch `src/app.js`, a shared file, so Claude rules on it first.
10. **Grey patches that fill the screen for a moment.** Not reproduced by Kyle on a second drive. Do not chase it; note
    anything found under 4 that would explain it.

## Checks

One check per cured finding in the suite that owns the file, each stepping the real rules without a browser; every older
suite that names the changed files; the lane tier; the build. Browser scenarios `everburn-job3` and `scablands-land` are
for Claude to run.

## Not in this card

New story, new jobs, new enemies. Whether the thief, the riders or the weapons are fun is STORY-CHOICES' question.

## Measurements on the cloud checkout

Baseline `e0ca217d6`, Falcone F42, seed 1989, real Run Him Down Duel at 120 Hz.

1. Tin Town (5960, 62) and the Boneyard road shoulder (5198.80, 1529.16) both emit
   `world.ground.scab-plates` at 9.32 mph. The region chooses that cue in
   `src/world/scablands-regions.js:189`. A refused climb requests the same retired cue in
   `src/sim-scablands.js:38`. Only the audio layer translates it to the landing thump.
2. A straight drive through the middle of the 9 m opening crossed at 20.41, 40.35 and
   60.41 km/h with zero hits. The two posts measure 2.10 × 2.10 m in both the mesh and grid.
   Each fence measures 14.12 × 0.20 m in the mesh but 14.00 × 0.30 m in
   `src/world/tin-town-gate.js:53`, extending the collider 5 cm on each face.
   Both solid posts match the drawing vertically from 0 to 7 m. Each fence's
   0 to 3.20 m grid height fits its −0.062 to 3.510 m drawn envelope. The
   fence thickness does not explain a hold in the middle of the gate.
3. On the first straight the thief's velocity and rule heading are both 0°, but the view
   turns the nose to 180°. On the next authored stretch a −32.89° heading draws at −147.11°.
   `src/arena/modes/world-job.js:825` already uses the true displacement.
   `src/render3d.js:1079` reverses its Z component and also turns a stationary actor to 0°.
4. The coarse horizon can cover a car on Tin Road, 1,611 m along the road at
   (5098.29, 1666.11). Its triangle is at 19.243 m, 1.388 m above the car's
   adjusted ground height (17.855 m). The actual Falcone F42 measures 1.370 m
   from the bottom of its tyres to its highest visible vertex. The ribbon is at
   18.245 m. A survey every
   2 m covered 3,921 East Road, 1,619 Tin Road and 1,562 Boneyard Road positions.
   The coarse layer's highest offsets on those lines are −0.042, +1.388 and
   +0.541 m. Three.js generates **identical full WebGL program cache keys** for
   the near and coarse meshes. Only the coarse shader needs to discard fragments
   over the near window. `withHole` in `src/world/scablands-scene.js:135`
   changes that shader without changing its cache key. With the near shader
   compiled first the coarse layer can be drawn through the hole.
   The same survey measured the underlying near ground, gorge, road ribbon and
   crossings. The remaining largest offsets are 0.157 m on the East Road ribbon,
   0.551 m on its bridge deck at (3221.54, 301.83), 0.390 m on Tin Road's ribbon
   and 0.273 m on the Boneyard Road ribbon. The exact place in Kyle's picture is unknown.
5. The thief reaching within 30 m of the furnace triggers the return irrespective
   of player distance (`src/world/jobs/bellows-rule.js:324`). In a real Duel the
   player's parked car moved from (6025, 14) to (4263, 3044) in a single step.
   The thief restarts 150 m along the wreck line and 25 bellows condition is lost.
   The previous caption was still on screen. `src/world/jobs/step-lines.js:25`
   queues Cinder's existing explanation while the move in
   `src/arena/modes/world-job.js:1244` takes effect immediately.
   No separate Boneyard approach trigger appeared in the rule or the position writers.
   The other ways a player can move after a world job starts are listed below.
6. At 60 km/h against a stationary Ash rider 12 m ahead, the player's speed fell from
   59.44 to 4.75 km/h. The player lost 7.50 armour, the rider lost zero and retreated,
   and the only sound event was `scrape`. The same Falcone facing a stationary arena
   car fell from 59.45 to 14.92 km/h. Both cars lost 23.49 armour and the game emitted
   `vehicleSmash`, `scrape` and two `combatRamHit` events. Job cars enter the scenery
   sweep (`src/sim-contacts.js:396`) and the encounter orders a retreat
   (`src/arena/modes/world-job.js:317`). Arena car pairs enter the smash path
   (`src/sim-contacts.js:80`).
7. At (100, 0), facing a stationary car 30 m ahead, both crossbow bolts left at
   200 m/s from y = 3.292 m. The job shot had no locked target and zero vertical
   speed. It registered one swept hit on the thief at y = 1.446 m and carried on.
   This takes 20 bellows condition and leaves the car's health alone
   (`src/world/jobs/bellows-rule.js:265`). The arena selected `cpu-1`, aimed down
   at 5.642 m/s, removed 12 armour and consumed the bolt. The target chooser
   (`src/combat-weapons.js:273`) uses combat cars. Job targets are observed by
   a separate sweep (`src/combat-projectiles.js:289`).
8. The real flee request spawns the thief at (5972.84, 64.08) in the first chase
   stretch. The grid returns zero person colliders there.
   `src/arena/modes/world-job.js:1229` adds him only to the actor list and
   `moveJobRaiders` updates only his position. With a person collider, he covers
   6 m in one second and a car driven at him from 12 m at 20 km/h stops 2.80 m away.
9. In `src/app.js:2873` an unlocked pointer event outside the canvas is discarded.
   A 400 px horizontal move in one event is clamped to 300 px. At the 0.0022 radians/px
   turn rate in `src/onfoot.js:177`, this loses 12.61° of turn. Four 100 px events inside
   the canvas keep all 50.42°. Driving the real app listener and foot-look rule
   returned 0°, 37.82° and 50.42° respectively for an outside event, one inside
   event and four inside events.
10. No independent reproduction of the grey flash. The overlapping horizon in finding 4
    is a possible source of an abruptly visible surface. Its colour and any link to the
    flash need a visual reproduction.

### Positions set after a world job starts

| Trigger | What moves and why | Source on the measured revision |
| --- | --- | --- |
| Bellows thief reaches the furnace | Car and, if on foot, fighter move to the Boneyard entrance to repeat the chase. Earned knocks are retained. | `src/arena/modes/world-job.js:1244` |
| Player's car finishes its wreck timer | The arena places the repaired car at a clear spawn slot at 12 mph and signals a respawn with a sound and shimmer. The HUD counts down while wrecked. | `src/arena/arena-event.js:138`, `:422` |
| Fighter finishes the normal knockdown timer | The fighter gets up beside the player's parked car. | `src/onfoot.js:131`, `:201` |
| Light the Town recovers a knocked-down fighter | On Easy the fighter returns beside the last lit lamp if one exists. Otherwise the fighter returns to the hearth. | `src/arena/modes/world-job.js:1146` |
| The Iron Line boards, rides or leaves the train | Boarding places the fighter on the roof plate. Each tick carries the rider along the train. Dismount sets the ground height. Driving uses the train's position. | `src/arena/modes/world-job.js:1751`, `:1774`, `:1790` |

The car and fighter spawns at the start are in `src/arena/modes/world-job.js:219` and `:235`.
Ordinary door entry and exit are player-controlled (`src/onfoot-transition.js:153`).
World bounds clamp lateral movement at the venue edge (`src/arena/arena-floor.js`).
The furnace's own restart resets its actor (`src/arena/modes/world-job.js:933`).

### Browser check at the measured hollow

The laptop scenario `scablands-land` places the real player car at (5098.29, 1666.11)
and saves the frame. It compares the two compiled WebGL program IDs and checks the
pixels around the car with the horizon visible, the horizon hidden and the car hidden.
Run it alongside `everburn-job3`. Claude reviews the picture, the sound and the restart.
