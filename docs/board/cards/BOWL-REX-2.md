# BOWL-REX-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (physics: a solid beast, and a cable between it and the truck). Kyle, 20 November 2026: graphics and physics go to Astra, the rest to Sol.

The Scrapasaurus fight remade so that a child can see what to do and do it. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md),
section 10, option A. Kyle, 20 November 2026: "a good idea", but he could not tell how to beat it; the truck drives
through it; "land on its back" and "smash its three battery boxes" could not be done or understood. And on the first
remake (drive up its tail): "a bit too on the nose. there must be a better way." **Nothing here is driven up: the driver
hooks the open box and pulls it out.**

**Measured before (Claude's hand drive):** it took 19 seconds to come round to its first fire; when it rested it was at
the edge of the picture and nothing on the floor showed where to drive; a truck placed by hand exactly on its rails 22 m
short of the junk car and driven flat out was thrown 7 m up, passed through the body, and a box was counted as smashed.

## What to build

The rules in `src/bowl/bowl-rex.js` and `src/bowl/bowl-hook.js`, from seed and inputs alone, with every place from the
course's own data.

1. **It is solid.** Its legs, body and tail turn a truck back by the wall rules (BOWL-WALLS). A truck never passes
   through it, on the ground or in the air.
2. **It comes to the driver.** It starts at the Car Park Gate (`features.bowl.gates`) beside the truck, walks its rails
   by the shorter way round towards the truck, and breathes its first fire within 8 seconds on every level.
3. **Tired.** After each breath of fire on Easy, and after every second one on Medium and Hard, it sags where it stands
   and one box opens: the hip first, then the back, then behind the head. The junk car it dropped, the landing on its
   back, the eating and the limp all go.
4. **The tow hook** (`src/bowl/bowl-hook.js`), fired with F, carried in this event in place of the night's weapon.
   - With an open box within 25 m and within 60 degrees of the truck's nose, the hook flies to that box (0.3 seconds) and
     bites. State says whenever a shot would bite, for the marker.
   - At any other time it flies 15 m, falls and winds back in over 1.5 seconds. A hook that meets the beast anywhere but
     an open box bounces off (`hookClang`).
   - The cable is 15 m. The truck cannot go further from the box than that. F again lets go. If the beast gets up, the
     box shuts and throws the hook off.
5. **The pull.** While the cable is at its full length and the throttle is held with the truck heading away from the box,
   pull time counts, and the truck is held at the cable's end in a nose-up pose (the trick rules' pose). Nitro counts
   double. A truck that reaches the cable's end at 20 mph or more adds 1 second (a jerk), once for each time the cable
   goes tight. The truck may move sideways along the arc at the cable's end and the pull still counts. **Pull time
   already earned on a box is never lost.**
6. **Three boxes:**
   - **Hip:** it stays down while hooked. Pull needed: 2 seconds on Easy, 3 on Medium and Hard.
   - **Back:** after 1 second of pulling it braces and drags the truck towards it at 2 m a second while the truck is
     pulling without nitro; under nitro the truck holds its ground. Pull needed: 3 seconds on Easy, 4 on Medium, 5 on Hard.
     On Easy the drag does not stop the pull counting.
   - **Behind the head:** when the cable goes tight it begins its tell and then breathes fire along the cable, into the
     cone fixed and drawn at the start of the tell, as its fire always is. Pull needed: 3 seconds on Easy, 4 on Medium, 5
     on Hard.
7. **A box out:** `boxOut`; the truck is let go with a push forward; the box is dragged behind on the cable, bouncing on
   the floor, until F. It does no harm to anything.
8. **Angrier each time:** after the first box its fire sweeps 30 degrees to each side; after the second it also throws
   cars (the ring on the floor first, as today).
9. **Easy:** the first time it tires it stays tired for up to 45 seconds or until the first box is out.
10. **Losing:** five scorches on Easy, four on Medium, three on Hard; or it has tired six times (five on Medium and Hard)
    and still has a box, and walks out through the Car Park Gate.
11. **The goal line** is never longer than five words and follows the fight: "GET OUT OF THE ORANGE", "HOOK THE GLOWING
    BOX", "DRIVE AWAY AND PULL", "KEEP PULLING", "TWO BOXES LEFT". State carries a marker for the screen: the open box,
    with its distance and whether a shot would bite.
12. **A card before the fight:** three pictures and three sentences (get out of the orange; when it sags, hook the
    glowing box with F; drive away and pull until the box comes out). **Why a try failed,** once each: the hook was fired
    with no box open; the cable was slack; it pulled the truck in; scorched in the orange.
13. **The ending:** with the third box out it falls along the floor. The result waits 10 seconds (BOWL-HUD shows the
    card), and the last box stays on the cable for that time.

## Files and locks

`src/bowl/bowl-rex.js`, `src/bowl/bowl-hook.js` (new), `src/bowl/bowl-rex-view.js` (follow the new state and draw the
cable as a plain line; the look is BOWL-REX-LOOK's), `src/bowl/bowl-lines.js`, `src/bowl/bowl-screens.js` (the card
before the fight), one line for F on the Bowl in `src/input-contexts.js` if BOWL-WEAPONS has not added it,
`tools/test-bowl-rex.mjs`, `tools/scenarios/bowl-rex-fight.mjs`. Lock: `bowl-screens`.

## Checks

1. `tools/test-bowl-rex.mjs`: a truck cannot pass through it anywhere; its first fire comes within 8 seconds; the hook
   bites only an open box in reach and bounces off otherwise; each box comes out after the pull the table gives, with a
   jerk and nitro counted as the rules say; pull time survives letting go and the beast getting up; the three ways of
   losing; the goal line never over five words.
2. A scripted child-pace driver who waits for it to sag, presses F when the marker says a shot would bite and then holds
   the throttle away from it, with no nitro and no steering during the pull, wins on Easy at least 9 times in 10.
3. The scripted drive (one way): `tools/scenarios/bowl-rex-fight.mjs` brought up to date to win with the hook. Claude runs
   it. Every changed assertion is listed in the change note for Claude's review (rule 18).

## Sound cues

Kept: `bowl.rex.roar`, `bowl.rex.fire`, `bowl.rex.fire.end`, `bowl.rex.scorch`, `bowl.rex.box.open`, `bowl.rex.bump`,
`bowl.rex.lift`, `bowl.rex.throw`, `bowl.rex.throw.land`, `bowl.rex.fall`, `bowl.rex.gate`. New: `bowl.rex.burst` (it
comes out of the gate; stand-in `world.furnace.horn`), `bowl.rex.sag` (it tires: a long hiss of steam and a groan;
stand-in `weapon.flame.end`), `bowl.rex.rise` (it gets up; stand-in `raider.warning`), `bowl.rex.sweep` (the sweeping
fire; stand-in `weapon.flame.start`), `bowl.rex.brace` (it plants its legs and pulls back; stand-in `yeti.roar`),
`bowl.hook.fire` (stand-in `weapon.harpoon.fire`), `bowl.hook.bite` (the hook takes hold of the ring; stand-in
`heli.setdown.thud`), `bowl.hook.clang` (it bounces off; stand-in `vehicle.crash`), `bowl.hook.tight` (the cable
creaking while it is pulled, held; stand-in: name only), `bowl.hook.jerk` (the cable snaps tight at speed; stand-in
`vehicle.crash-impact`), `bowl.hook.letgo` (stand-in `interface.radar`), `bowl.rex.box.out` (the box tears out in
sparks; stand-in `weapon.tesla.pulse`), `bowl.rex.box.drag` (the box bouncing along the floor behind the truck; stand-in:
name only). Removed with their events: `bowl.rex.eat`, `bowl.rex.drop`, `bowl.rex.box.close`, `bowl.rex.box.smash`.

Behind `titan-bowl`. Builder's checks, then the lane tier and `npm run build`, recorded in `docs/changes/BOWL-REX-2.md`
with a Removed line. Before CARD DONE, search `tools/` for `scrapasaurus`, `rex`, `boxPastCar` and `launchCars` and bring
each older suite and scenario that names them up to date. No Chrome under `codex exec`: any browser scenario is "Claude
runs". Memory-only saves. No new dependency, network request or key. Clean up nothing outside this lane.
