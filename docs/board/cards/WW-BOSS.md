# WW-BOSS

The short board entry controls current state, ownership, dependencies and locks.

Job 6's end. The furnace follows a path across the map; three vents glow in turn, and a hit in the glow counts; it rolls into the well. Warlord hook shape (`src/warlords/magnus.js`) for tells and Easy, in `src/world/jobs/old-smoke.js`. Never a ring.

**Checks:** `tools/test-old-smoke.mjs`: three hits end it, vents only count when glowing, Easy child driver 8 in 10.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-BOSS.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Settled design (Claude, 9 November 2026)

This replaces the short line above where the two differ. The stub in `src/world/jobs/old-smoke.js`
(three vents that take turns every 3 seconds) goes.

**What the player should feel.** Something huge is running away with the fire, and the player's own
driving brings it down. The skill is where the car is, not how fast a button is pressed.

**Three legs, one vent each.** The furnace drives one fixed path of waypoints from the well: across
the open flats, through the Boneyard between the planes, then round and back toward the well. Each
leg has one vent, and the vent is on a different side each time, so the player must put the car in
a different place:

| Leg | Ground | Vent | Where the car must be |
| --- | --- | --- | --- |
| 1 | Open flats | Left door | Alongside on the left |
| 2 | The Boneyard | Right door | Alongside on the right, with planes in the way |
| 3 | The run back to the well | Rear door | Behind it, in its cinders |

**One rhythm, repeated: stoke, glow, slam.**

- *Stoke, 4 seconds.* The door that will open rattles, and the smoke from the chimney turns from
  grey to orange. This is the warning, and it shows which side. The furnace's bellows sound rises.
- *Glow.* The door stands open and white-hot: 6 seconds on Easy, 4.5 on Medium, 3.5 on Hard. One hit
  on that door ends the leg. Any weapon counts, and so does ramming that side of the furnace with
  the car, so a driver with no ammunition can still win.
- *Slam.* If nothing hit the door, it slams shut and the rhythm starts again after 3 seconds. A miss
  never loses the job.

**What the furnace does to the player.** It never shoots.

- *Cinders.* It drops a trail of burning cinders behind it that lasts 5 seconds. Driving through
  them costs armour on Medium and Hard. On Easy they only slow the car.
- *The shoulder.* If the car sits beside the furnace for 3 seconds while no door glows, the chimney
  leans toward the car and the horn sounds for 1.2 seconds, then the furnace swerves into that
  side. The shove costs armour, half as much on Easy. Dropping back or crossing over avoids it.

**After each hit.** The furnace staggers for 2 seconds, a plate falls off, the smoke turns blacker
and the story line for that vent plays. On Medium and Hard it then runs one tenth faster. It is
always slower than the slowest car the story allows, on every difficulty, so the player can always
catch it.

**The end.** On the third hit the furnace turns for the well and Cinder shouts to get clear. It
rolls in after 5 seconds and the flame goes up as high as the mast. The job is already won at the
third hit: a car still close to the well loses armour on Medium and Hard but can no longer lose.

**Losing.** Only a wrecked car loses, and the chase then starts again from its own beginning; the
three waves are not played again. On Hard the furnace also escapes if it finishes its whole path
with a door still unbroken, which takes about four minutes.

**Easy.** Longer glow (above), a door that is easier to hit (radius 2.0 m instead of 1.2 m), no
speed-up, cinders that only slow, half shoves, and an arrow on the HUD that points to the side
where the next door will open.

**Look and sound.** Draw the furnace half again as large as its model (the art verdict asks for
this) with the game's smoke on the chimney and the game's fire in the open door. Within 30 m the
camera trembles a little; that is drawing only and changes no race state. Use existing cues and
name each one in the change note: stoke, door open, door slam, hit, shove warning, the fall into
the well.

**Repeatable.** The path, the timing and the side all come from the job clock and the seed. No
drawing code changes the chase.

**Checks** (`tools/test-old-smoke.mjs`), in place of the line above:

- Three hits end it, each only on the open door of its own leg; a hit on a shut door or the wrong
  side counts for nothing.
- The same seed and inputs give the same chase.
- The furnace is slower than the slowest story car on every difficulty, after every speed-up.
- A miss never loses on any difficulty; after the third hit nothing can lose the job.
- A scripted Easy driver who only rams wins 8 times in 10.
- Laptop only (Claude): the chase played once on Easy and once on Medium in the browser.

## Art notes to carry out here (Claude)

The art merged at the three-round cap with fixes left for this card. Read the last "Round 3" verdict on `docs/board/cards/WW-ART-VEHICLES.md` and do those fixes here, as materials, placement or the look of props. They are not new art rounds.
