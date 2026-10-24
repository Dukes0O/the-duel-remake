# MAP-DATA

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/PILOT_MAP.md`; this card names the slice, files and acceptance.

Claude in the cloud (runs without graphics). Pilot's map sections 2 and 4.
Switch `pilot-map` (dev; add it to `src/feature-flags.js`, the switch
inventory tests gaining one row with Claude's written review on this card).
Can start now.

- `src/heli/pilot-map-data.js`: the place table of section 2 (ids, km,
  region), fuel pads and prices, and the region shapes (coastline, sea depth
  lines, lakes, rivers, mountain contours, forest, desert, city) as simple
  polygons in km.
- `tools/build-pilot-map.mjs`: traces each course's road from its own
  course build, shrinks it to fit its place (about 1.2 km across on the
  map), and writes `src/generated/pilot-map.json` (committed, since the game
  loads it).
- `legFuelKgMap(from, to)`: the four existing legs keep their table
  numbers; every other leg is 12 kg per km of straight-line distance plus
  5 kg, rounded up to 5 kg.
- `tools/test-pilot-map.mjs`: every place in the course registry is on the
  map once; no two outlines overlap; the four old legs unchanged; the new
  rule's numbers (home to Pacific Canyon 290 kg); every place within a full
  tank of some fuel pad; the generated file matches a fresh build.

Owns: the files above, `docs/changes/MAP-DATA.md`. Hooks:
`src/feature-flags.js`. Locks: none. Sound: none. Art: none (drawn from
data).

Acceptance: the test, lane tier, build, one review. Removed: nothing.
