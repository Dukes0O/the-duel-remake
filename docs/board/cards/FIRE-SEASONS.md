# FIRE-SEASONS

The dispatch season clock in the mission engine: no forest fire in winter, and the first snow puts a burning fire out.

Owner: Claude (SIM). Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds
state, needs and locks.

Kyle, 15 October 2026. Packet section 3.6. Files: `src/heli/heli-missions.js`
(the season from `playDay.count`, the weights table with every kind's row
from `docs/HELI_RESCUE.md` section 3.2, the weighted pick), `src/heli/heli-fire.js`
(the first snow), one line in `src/heli/heli-board.js` (the season), and
`tools/test-heli-missions.mjs`. No new save field, no lock. H2's release
(FIRE-FINISH) waits for it.

## Claude answers (built 15 October 2026)

- Play day 0 (a save that never noted a day) reads as summer day 1.
- The snow's board note comes from the save (a scar dated today on a winter
  day), so it shows when the app noted the day before the visit too; it
  lasts that play day.
- The season line on the board shows only with the fire switch on.
- Roger's winter line waits for the avalanche kind (H4); summer's plays now.
