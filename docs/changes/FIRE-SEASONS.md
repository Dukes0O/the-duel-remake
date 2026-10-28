# FIRE-SEASONS

Claude, 15 October 2026. Kyle: seasons decide which emergency comes, and
there is no forest fire in winter. Design: `docs/HELI_FIRE.md` section 3.6.

## What changed

- `src/heli/heli-missions.js`: the dispatch season (`seasonOf`) turns every
  12 play days from `playDay.count`, summer first (play days 0 and 1 to 12),
  then autumn, winter, spring. `SEASON_WEIGHTS` holds the whole table from
  `docs/HELI_RESCUE.md` section 3.2 (fire 4, 2, 0, 1); kinds not yet in
  `MISSION_KINDS` are never offered. A kind with weight 0 is not possible,
  so in winter no fire call comes, and refuels in a season when no kind can
  come do not count (`seasonOpen`). The pick is weighted (`pickKind`) and
  still takes one draw, as the even pick did, so the course draw after it
  and every recorded flight are unchanged.
- `src/heli/heli-fire-run.js`: `fireOnNewDay` (the helicopter visit and the
  app's profile hook both use it) puts a burning fire out when a winter play
  day begins: no pay, no course lost, its burnt and burning cells kept as a
  scar dated that day, the mission ended with its quiet spell, not counted
  as put out. Roger's season line plays once a visit at a lift-off in a
  season's first two play days; the winter line waits for the avalanche
  kind (H4). `season()` gives the board the season and, on the day it fell,
  the snow's note, worked out from the save (a scar dated today on a winter
  day), so it shows whichever path noted the day.
- `src/heli/heli-session.js`: the view carries `season`.
- `src/heli/heli-board.js`: "Winter, play day 1 of 12" with the fire switch
  on, and the snow's note.
- No save shape change; no lock held.

## Tests

- `tools/test-heli-missions.mjs`: 20 groups, 7 new (season turns, no winter
  call, winter refuels, the weighted pick, one draw, the first snow, the
  snow note on either path, the board line).
- Changed assertion: the quiet-spell check that engine time alone blocks a
  call used play day 30, which is now winter, so it passed for the wrong
  reason. It now uses play day 20 (autumn) and tests the 20-minute rule
  again. Nothing weakened.
- `tools/test-heli-fire-session.mjs` 75 checks unchanged, same flight.
- Lane tier and build: see the merge's run-log line.

## Review

One independent review (code and design numbers). It found two real
faults, both fixed before merge: the snow note was lost when the app noted
the play day before the visit (now worked out from the save), and winter
refuels still counted (now they stand still). Three weak tests were
tightened.

## Removed

Nothing.
