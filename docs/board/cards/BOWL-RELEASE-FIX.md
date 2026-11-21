# BOWL-RELEASE-FIX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** The last fixes before Show Night goes live, from Claude's final drive of the whole season on
`e27c0c2c0` (21 November 2026; pictures in `.evidence/2026-11-21/final/` of the integration folder). The season was played
from Night 1 and won to Night 5 on Easy; every earlier fix held. Items 1 to 3 hold the release.

## What to build

1. **The truck leaves the arena in the Scrapasaurus fight without a jump.** Holding only W from the start, the truck was out in
   the car park within about 9 seconds and 556 m out by 30 seconds (`n5-wonly-10s.jpg`); a driver dodging the fire left the
   same way. The fight is meant to be inside the Bowl. For the Scrapasaurus fight only, both gates are shut on the ground (a
   steel shutter drawn down over each mouth, solid by the wall rules), from the moment the beast is through its gate until the
   fight ends. A jump over the wall is still possible and still a find; the gate arrow then leads back to the nearest gate, which
   opens for the returning truck and shuts behind it.
2. **Night 5's Last Truck Rolling cannot be won on Easy by hand:** lost 3 of 3, each time to Dragon Wagon as the last rival, on 10
   to 14 health. On Easy only, Dragon Wagon's fire counts under the shared saw-and-fire limit, its armour is the other rivals',
   and it joins the hunt last. Re-measure the chaser and the careful driver on Night 5 with each weapon; both gates as
   BOWL-LTR-EASY set them.
3. **The Freestyle strip's words overlap:** "Beat Tin Lizard's 3,000 points." wraps into a narrow column and runs into the scores
   line on every night (`n3-free3-lap2.jpg`, `n5-free-lap0.jpg`). The goal and the scores each keep one line at 1282 by 716.
4. **One cue fired with no name** (`null`) early in Night 1's Car Crush. Find it and give it its cue, or stop it firing.

## Checks

1. In the Scrapasaurus fight a truck holding only W for 60 seconds, and a truck driven at each gate at 40 mph, stays inside; a
   truck that jumps out gets back in through a gate.
2. Night 5's chaser and careful driver on Easy, ten seeds per weapon, as assertions with the BOWL-LTR-EASY ranges.
3. `tools/test-bowl-hud.mjs`: at 1282 by 716 the Freestyle goal and the scores line do not overlap on any night.
4. No Bowl cue event carries a null name.

## Sound cues

`bowl.gate.shut` (the shutters come down; stand-in `world.furnace.horn`), `bowl.gate.open` (a shutter lifts for a returning
truck; stand-in `bowl.out.gate`).

Behind `titan-bowl`; merges under AGENTS rule 23, recorded in `docs/changes/BOWL-RELEASE-FIX.md` with a Removed line.
Memory-only saves.
