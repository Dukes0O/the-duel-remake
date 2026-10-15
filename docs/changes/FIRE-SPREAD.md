# FIRE-SPREAD: the forest fire

Card: FIRE-SPREAD (Claude, SIM lane, no lock). Design: `docs/HELI_FIRE.md`
sections 4 and 8.5; final numbers under "Claude answers" on
`docs/board/cards/FIRE-SPREAD.md`.

Needs: FIRE-SAVE (the hash and the fire record) and FIRE-BUCKET (the lake
check `ground.water`); this lane was cut from FIRE-SAVE with FIRE-BUCKET
merged in, and merges after both. The H1 dependency is met by
HELI-FINISH's code at 64198f94 (the main design session ruled the pending
H1 release is not a build dependency).

## What changed

`src/heli/heli-fire.js` (new), pure and repeatable, no graphics:

- `fireGrid(course, ground, site)`: 20 m cells holding 3 or more tree
  obstacles, minus cells on the road, the lake (checked at the centre and
  four edge points with the bucket card's water query) and the pad; each
  cell's height, distance to the road edge, start line and pad; the
  connected stretch each cell belongs to; and the lost size.
- `burnCheck` and `courseBurnCheck`: the four rules (forest not snow with
  150 cells, a helicopter destination, a lake, a burnt look). Tremblant
  Woods passes; Tremblant Snow (snow) and Panorama Ridge (no water) do not.
  It is a check, not a list of names; `BURNT_LOOKS` lists the courses whose
  burnt look is made.
- `startCells`: 40 m from the road edge, 150 m from the start line and the
  pad, 250 to 1,000 m from the shore, outside scars, and in a stretch of
  forest at least twice the lost size. `startFire`: the seeded start cell at
  0.75 and two forest neighbours at 0.5, in the save's fire shape.
- `dayWind(seed, playDay)`: calm 0 to 1 m/s (40%), breeze 3 to 4 (40%),
  windy 6 to 8 (20%) from one of 8 points.
- `spreadStep`, `spreadChance`, `spotChance`: the tuned rules on the card
  (grow first, uphill and downwind faster, damp 0.2 for 2 steps, embers two
  cells downwind that never cross a road or the lake).
- `applyWater(fire, grid, patches)`: each wet patch shared among the cells
  its disc covers; 180 litres take a burning cell from 1 to 0; a cell put
  out turns burnt; water on unburnt forest makes it damp. It never imports
  heli-bucket.js.
- `fireOut`, `fireLost`, `fireSize`, `shareOut`, and `hottestEdge` (the
  burning edge cell, downwind first, for the autopilot, the instruments and
  the drop robot).

## Tuning

See the card. Medians over 50 seeds: left alone calm 15 steps (target 12
to 16), windy 11 (8 to 11); answered at once 5 drops (4 to 8), one play
day late 11 (8 to 14), two play days late 20 (14 to 22).

## Tests

- `node tools/test-heli-fire.mjs` (new): 12 groups passed (the numbers; the
  four rules on the three real courses; the grid never on road, lake or
  pad; start cell rules and scars; the wind's mix and repeatability; uphill,
  downwind and damp chances; no fire ever leaves the forest grid in 40
  windy steps; water, damp, out, lost and the save shape; the section 4.5
  targets; same drops, same fire).
- `node tools/test-heli-mode.mjs`: 146 checks passed.
- Lane tier and build: below.

## Review (rule 17)

One independent reviewer read the three lanes cut from FIRE-SAVE. It ran
200 seeds with odd drops: a saved and reloaded fire never drifted from the
live one, the biggest fire stayed under the save's 80 cells, no fire left
its stretch of forest. Fixed: the fire's clock (one step per 90 s of engine
time, three per new play day, cruise by fuel) existed only as numbers; it
is now `runFireEngine`, `fireNewDay` and `cruiseSeconds`, tested a frame
at a time. The grid is pinned to course seed 1989 (a different seed builds
a different grid). Embers checked one in-between cell on one side and two
on the other; now the same both ways. New tests: no road or lake between
neighbouring forest cells, lit cells stay in the fire's stretch, and the
wind blows from where it is named.

## Changed assertions

- `tools/test-heli-mode.mjs`: merging FIRE-SAVE's and FIRE-BUCKET's import
  allowances into one list (no new allowance in this card).

## Removed

Nothing.
