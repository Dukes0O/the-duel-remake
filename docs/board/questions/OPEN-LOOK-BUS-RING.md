# OPEN-LOOK-BUS-RING: questions for Claude

Written by the cloud session of 26 November 2026. The work carried on with each pick below.

## 1. Whose spots does the game read for the Bus Ring?

OPEN-T-MARKET (on `codex/open-t-market`, not merged) has a stand-in `BUS_RING` in
`src/world/open/content/market-day-places.js`: three box buses and spots `workbench` (0, 4), `car-stop` (0, 15) and
`lookout` (0, 15). Those points lie inside the drawn ring or under its buses. The look keeps the names and gives its own
positions in `BUS_RING_LAYOUT.spots`, with `busRingSolids('camp')` for the solids.

- **a.** OPEN-T-MARKET (or a small card after it) replaces its stand-in with the look's spots and solids, as
  `src/world/open/site-rule.js` does for the Glasshouse: a plain-data copy for the rules, held equal to the look by a test.
- **b.** The look moves its spots to the stand-in's points. It cannot: they are under buses.

**Pick: a.** The leader's place is `gasket` (at the lathe) and the meeting place `workbench`; Gasket's bed is `bunk`.

## 2. The Bus Ring stands on the salt, not in the hill country

`land.at('ridge', -665, -345)`, where OPEN-T-MARKET puts it, is on the white salt pan below the ridge, 40 m under the
Ridge Road. Section 16 says "in the hill country". The ridge's edge hides the camp from the Ridge Road itself; the
first road that sees it is the Ridge spur, about 690 m to the south, where it comes down onto the pan.

- **a.** Keep the position. The gate faces the spur and the marks on the ground are drawn for salt.
- **b.** Move the site up into the hills (OPEN-T-MARKET's file), and turn the gate to its road.

**Pick: a** for round 1, since the place is OPEN-T-MARKET's. The look reads its gate's direction from one constant
(`GATE_FACING`), so a move costs one line and a new set of pictures.
