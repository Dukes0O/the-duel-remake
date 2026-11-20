# BOWL-REX-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics: a solid beast whose tail and back are ground). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The Scrapasaurus fight remade so that a child can see what to do and do it. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md),
section 10. Kyle, 20 November 2026: "a good idea", but he could not tell how to beat it; the truck drives through it;
"land on its back" and "smash its three battery boxes" could not be done or understood.

**Measured before (Claude's hand drive):** it took 19 seconds to come round to its first fire; when it rested it was at
the edge of the picture and nothing on the floor showed where to drive; a truck placed by hand exactly on its rails 22 m
short of the junk car and driven flat out was thrown 7 m up, passed through the body, and a box was counted as smashed.

## What to build

The rules in `src/bowl/bowl-rex.js`, still from seed and inputs alone, with every place from the course's own data.

1. **It is solid.** Its legs, body and tail turn a truck back by the wall rules (BOWL-WALLS). A truck never passes
   through it.
2. **It comes to the driver.** It starts at the Car Park Gate (`features.bowl.gates`) beside the truck, walks its rails
   by the shorter way round towards the truck, and breathes its first fire within 8 seconds on every level.
3. **Tired.** After each breath of fire on Easy, and after every second one on Medium and Hard, it sags where it stands
   if it is on a straight (on an end it walks on to the straight first). While it is tired **its tail is ground**: a ramp
   at least 4.5 m wide and no steeper than 25 degrees from the floor to its back, and its back is ground. One box is open.
4. **Three boxes in a row up its back:** at the root of the tail, in the middle of the back and on the shoulders. A truck
   with a wheel on the open box smashes it; so does a truck that comes down on it out of the air ("From the sky", 300
   points). The first is reached at any speed, the second with a run at the tail at 25 mph or more, the third at 40 mph
   or more. One box each time it tires.
5. **Angrier each time:** after the first box its fire sweeps 30 degrees to each side; after the second it also throws
   cars (the ring on the floor first, as today). The eating and the limp go.
6. **Easy:** the first time it tires it stays tired for up to 45 seconds or until the first box is smashed.
7. **Losing:** five scorches on Easy, four on Medium, three on Hard; or it has tired six times (five on Medium and Hard)
   and still has a box, and walks out through the Car Park Gate.
8. **The goal line** is never longer than five words and follows the beast: "GET OUT OF THE ORANGE", "DRIVE UP ITS TAIL",
   "SMASH THE GLOWING BOX", "TWO BOXES LEFT". State carries a marker for the screen: the foot of the tail while it is
   tired, then the open box.
9. **A card before the fight:** three pictures and three sentences (get out of the orange; when it sags, drive up its
   tail; drive over the box with the light on it). **Why a try failed,** once each: too slow up the tail; it got up
   before the box was reached; scorched in the orange.
10. **The ending:** state says when the truck stands on the fallen beast, for the result card's wait.

If the simulation cannot make ground that follows a moving thing, the beast tires only at two fixed places, one on each
straight, whose ground the course switches on while it is tired. Say which was built in the change note.

## Files and locks

`src/bowl/bowl-rex.js`, `src/bowl/bowl-rex-view.js` (follow the new state; the look is BOWL-REX-LOOK's),
`src/bowl/bowl-lines.js`, `src/bowl/bowl-screens.js` (the card before the fight), `tools/test-bowl-rex.mjs`,
`tools/scenarios/bowl-rex-fight.mjs`. Lock: `bowl-screens`.

## Checks

1. `tools/test-bowl-rex.mjs`: a truck cannot pass through it anywhere; its first fire comes within 8 seconds; a truck
   driven up the tail at 15, 30 and 45 mph reaches the first, second and third box; the three ways of losing; the goal
   line never over five words.
2. A scripted child-pace driver who waits for it to sag and then drives at the marker wins on Easy at least 9 times in 10.
3. The scripted drive (one way): `tools/scenarios/bowl-rex-fight.mjs` brought up to date to win by the tail. Claude runs
   it. Every changed assertion is listed in the change note for Claude's review (rule 18).

## Sound cues

Kept: `bowl.rex.roar`, `bowl.rex.fire`, `bowl.rex.fire.end`, `bowl.rex.scorch`, `bowl.rex.box.open`,
`bowl.rex.box.smash`, `bowl.rex.bump`, `bowl.rex.lift`, `bowl.rex.throw`, `bowl.rex.throw.land`, `bowl.rex.fall`,
`bowl.rex.gate`. New: `bowl.rex.burst` (it comes out of the gate; stand-in `world.furnace.horn`), `bowl.rex.sag` (it
tires: a long hiss of steam and a groan; stand-in `weapon.flame.end`), `bowl.rex.tail` (the truck's wheels on its tail:
plates rattling; stand-in: name only), `bowl.rex.rise` (it gets up; stand-in `raider.warning`), `bowl.rex.sweep` (the
sweeping fire; stand-in `weapon.flame.start`), `bowl.rex.sky` (From the sky; stand-in `crowd.cheer`), `bowl.rex.stand`
(the truck stands on it; stand-in `interface.win`). Removed with their events: `bowl.rex.eat`, `bowl.rex.drop`,
`bowl.rex.box.close`.

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-REX-2.md`
with a Removed line. Before CARD DONE, search `tools/` for `scrapasaurus`, `rex`, `boxPastCar` and `launchCars` and bring
each older suite and scenario that names them up to date. No Chrome under `codex exec`: any browser scenario is "Claude
runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this lane.

## Round-five model dimensions

Round five of BOWL-ART-REX uses metres, +Y up and +Z towards the head. The old pose scale assumes a 5.8 m head. The new standing head reaches 11.58 m. In the tired pose the tail runs 13 m from Z -16.10 at the ground to Z -3.10 at Y 5.44. It is 4.8 m wide at 22.7 degrees. The level back ends at Z 3.05. Battery centres lie on X 0 at Z -2.90, -0.22 and +2.56. Their tired tops reach Y 5.95. Use the same transform for the collision surface, markers and visible model. The open variant starts at scale zero. Hold the tired animation on its final frame while the truck can drive on the beast.
