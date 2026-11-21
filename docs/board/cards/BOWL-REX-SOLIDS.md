# BOWL-REX-SOLIDS

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (contacts). Three loose ends from BOWL-REX-LOOK (Claude, 20 November 2026). Design:
[BOWL-SHOW-2](BOWL-SHOW-2.md), section 10.

## What to build

1. **No invisible box under its feet.** Round 7 of the Scrapasaurus took away the plinth, rails and bogie that stood
   between its feet; it stands on its own toes now. `rexSolids` in `src/bowl/bowl-hook.js` still adds the `bogie` part
   (3.9 by 4.2 m, 0.56 m tall), so a truck that drives under its belly meets a box nobody can see. Remove that part. Its
   legs, body, tail and boxes stay solid as they are.
2. **It falls full length along the floor.** `fallPose` rolls it 1.42 rad about its feet and lifts it 2.9 m, which leaves
   it propped on its right leg with its flank about 1.2 m above the floor (`docs/board/looks/bowl-rex/round-7.jpg`, the
   last picture). Lower the lift so its flank lies on the floor; the drawing and the solids both read `fallPose`, so one
   change moves both.
3. **The beaten Scrapasaurus in the yard shows its torn leads.** The model now carries `battery-leads-1` to `-3` under
   each socket, parked at scale 0 in the file and shown by the fight when its box is out. The yard ornament
   (`src/scrapdome-yard.js`) shows all three boxes out, so it scales the three lead groups to 1.

## Files and locks

`src/bowl/bowl-hook.js` (`rexSolids` and `fallPose`), `src/scrapdome-yard.js`, `tools/test-bowl-rex.mjs`. No lock.

## Checks

1. `tools/test-bowl-rex.mjs`: no Scrapasaurus solid stands below its belly between its feet, the fallen body's lowest
   solid is within 0.2 m of the floor, and the yard ornament's
   three `battery-leads-N` groups are shown; the Easy drive results are re-recorded with a one-line reason if they move.
2. Rule 23: the core suite, the three guards and `npm run build`.

## Sound cues

None new.

## For Claude's drive (not this card)

From the driver's seat a box tearing out and the fall are both behind the truck: the chase camera faces the way the
truck pulls. Claude settles at the batch drive whether the show camera should look back at the beast for a moment.
