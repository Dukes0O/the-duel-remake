# HOME-GROUND-5

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Astra: a machine, its view and the water), Home Ground's step 5, first half: the well he drills by hand
and the tank it fills. The garden, the greenhouse and the first power foods are HOME-GROUND-5B. Kyle's direction of
27 November 2026 (night): carry the building and the story on through the night; Claude settles the design. Design:
`docs/HOME_GROUND.md` sections 4, 6 ("The well is drilled by hand") and 16; `docs/MACHINES.md` (the drill rig: lower,
feed, listen). Behind `home-ground`; it changes the save, so it keeps the lane tier and one independent review of the
save (rule 23, "Not covered").

Reuse before building: the drill rig already exists (`src/machines/drill.js`: `drillSite` with its buried water,
clay, gravel and rock; `stepDrill`, its feed rates and jamming; `createDrillRigState`, `stepDrillRig`,
`drillYardControls`; `src/machines/drill-view.js`), and the flatbed outing of step 3 shows how the yard sends him out
in a work machine.

## Design, settled by Claude before code

**Tin Town's drill rig.** Once his coop stands, the board adds: "Auntie Solder says the land under your ground has
water in it somewhere. Her drill rig is yours to borrow." The yard then offers "Go out in Tin Town's drill rig", an
open outing in the rig exactly as the flatbed's, with the rig's own tracks and slow speed. It fits the 8 m lanes.

**Choosing the spot.** On foot, G gains the well (1 by 1 cell), marked with B like the coop. The ground's water is
`drillSite` at that spot (seeded, whole metres), so some spots are shallower than others; nothing in the game tells
him which, but the board can say once: "Old Tam says water runs shallower near the low corner."

**Drilling, by his own hands.** Stopped with the rig over the mark (within 1.5 m), the prompt shows the rig's own
controls (`drillYardControls`): lower the mast, then feed the auger down. Clay goes quickly, gravel slower, rock slowest
and loud; feeding too hard in rock jams it, and he backs off to clear it. The sound changes when the auger meets water,
and the prompt says "You've hit water at 27 metres. Hold B to fit the hand pump." A well takes about three minutes of
play. Leaving halfway keeps the depth reached.

**The pump and the tank.** He fits a hand pump himself (hold B, six seconds, the hammer). The water tank is a build
kind (2 by 2 cells, four stages: the stand, the legs, the drum, the lid) from a load at Tin Town's gate on the flatbed,
as the coop is. A tank within 8 m of a well with a pump fills over 12 hours of the real clock from empty, counted while
the game is off too, with a pipe drawn between them. F at the tank says how full it is in a whole sentence. Nothing
goes wrong while it is empty; it simply waits.

**The save:** version 7 adds `well` (`{i, j, depth, water, pump}`) and the tank as a build with `litres` and `filled`
(the clock moment). Older versions load unchanged after the verified backup.

**Sound cues** to name: `home.drill.lower`, `home.drill.grind`, `home.drill.rock`, `home.drill.jam`,
`home.drill.water`, `home.pump.fit`, `home.tank.fill`.

## Checks

- `tools/test-home-ground.mjs` by behaviour: the well's depth comes from `drillSite` and is the same from the same
  seed; drilling stops at water and keeps its depth across outings; rock jams at too hard a feed; the tank fills in
  12 real hours across a closed game and never past full; a version 6 save loads unchanged.
- The lane tier, the rule 23 guards, `test-machine-*` suites that name the drill, and `npm run build`. One independent
  review of the save. Claude drives it by hand.

## Claude answers

**28 November 2026, the four choices** (the questions file, commit `5b9f8688e`): all approved. A 1,000-litre tank, the
crew raising later tanks in one real hour after he has built the first by hand. Drilling at home takes about three minutes
at a steady feed, with the drill's layers, jamming and reverse unchanged everywhere else. He fits the hand pump himself, as
this card says; Mr Penny's part becomes a motor pump when people move in (step 7). The drill joins the work vehicles and the
yard's action through the existing hooks, with the shared change kept to the app's outing gate.
