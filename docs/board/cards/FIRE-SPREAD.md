# FIRE-SPREAD

The forest fire: grid, start cell, spread uphill and downwind, wind, water, out, lost, scars.

Owner: Claude (SIM). Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet sections 4 and 8.5. Files: `src/heli/heli-fire.js`,
`tools/test-heli-fire.mjs`. Tune to the section 4.5 targets and record the
final numbers under "Claude answers" on this card. No lock.

## Claude answers (14 October): the final numbers

Tremblant Woods' trees stand in a strip one or two 20 m cells deep beside
the road (585 forest cells after the road, lake and pad are taken out). The
packet's starting values assume open forest: with them a fire left alone
never reached 80 cells in 60 steps, and wind made fires slower, because a
front can move at most one cell a step along a strip. So:

- Each step, every burning cell first gains 0.25, then every cell at 0.5 or
  more tries its 8 neighbours (a cell lit last step spreads this step).
- Embers: in a wind a burning cell also tries the ring two cells out, with
  chance `base x 3 x (wind factor - 1) x slope x damp`, downwind only, and
  only when a cell between is forest, so embers never jump a road or the lake.
- Base chance **0.55** (packet 0.12); **180 litres** per intensity point
  (packet 150); lost at **45 cells** (1.8 ha) or 40% of the forest,
  whichever is smaller (packet 80).
- Water a burning cell does not need (more than 180 litres a point) runs on
  once to its burning neighbours, and with none burning soaks the forest
  round it (damp). A stationary 600 L drop on a fresh edge cell (which needs
  45 litres) would otherwise waste the rest; this is what the drop robot
  already assumed, and the targets below hold with it.
- A fire starts only in a stretch of connected forest at least twice the
  lost size, so a fire left alone always grows to lost.
- Drop robot: the first drop two steps after the call (pad, bucket, lake),
  then one 600 L drop per step, 75% on the burning edge, downwind first.

Medians over 50 seeds (target): left alone calm **15** (12 to 16), windy
**11** (8 to 11), answered at once **4** drops (4 to 8), one play day late
**10** (8 to 14), two play days late **19** (14 to 22); about a quarter of
two-days-late fires are lost.

The windy median sits at the top of its range: on a strip of forest a front
moves at most a cell or two a step, and stronger embers (3.5, 4) did not
move it. The test reads Tremblant Woods' real trees, so a lane that moves
those trees can move these medians; rerun `tools/test-heli-fire.mjs` then.

The clock (section 4.2) is `runFireEngine` (a step per 200 s of engine time since
FIRE-FINISH, one real bucket trip; it was 90 s,
leftover seconds kept unrounded), `fireNewDay` (three steps) and
`cruiseSeconds` (fuel / 0.6 kg/s); none steps a lost fire. The grid is
built only from course seed 1989, the helicopter's, so saved cells always
name the same trees.
