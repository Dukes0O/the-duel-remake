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
