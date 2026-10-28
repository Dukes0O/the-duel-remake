---
task: MAP-DATA
status: review
kind: feature
flag: pilot-map
player_facing: no
---

# The pilot's map: place table, regions, fuel pads, leg rule, outlines (24 October 2026)

Card `docs/board/cards/MAP-DATA.md`, design `docs/PILOT_MAP.md` sections 2 and
4. The map's data and its tool, behind `pilot-map` (dev). Nothing reaches the
game yet: no screen, no key, no new destination, no save field (MAP-DESTINATIONS,
MAP-SECRETS and MAP-VIEW build on it).

## What it adds

- `src/heli/pilot-map-data.js`: the place table of section 2 (`PLACES`: id =
  the course's registry id, name, the courses it holds, `at` km, `drawAt` km,
  region text), `FUEL_PADS` and prices, `legFuelKgMap`, `nearestFuelPad`,
  `reachKm`, and the shapes of the chart as polygons in km (`MAP_SHAPES`: the
  land, three sea depth lines, 18 regions of forest, desert, city, mountain
  contours with their heights, lakes and the mesa, three rivers, the roads
  between towns). `placeOutline(traced, id)` puts a traced outline where its
  place is drawn.
- `tools/build-pilot-map.mjs`: traces each place's road from its own course
  build (seed 1989), centres it, shrinks it to 1.2 km at its longest, simplifies
  it to 6 m on the map and writes `src/generated/pilot-map.json` (10 KB, 552
  points, committed because the game loads it). `--check` says whether the file
  is current; the module also exports `buildPilotMap` and `traceCourse`.
- `src/feature-flags.js`: switch `pilot-map`, `dev`; the two switch inventory
  tests gain its row (below); `start-preview.bat` requests it (the preview
  launcher test requires every dev switch there).
- `tools/test-pilot-map.mjs`, 300 checks.

## Settled in writing (the card and packet leave these open)

- **The places.** 21: the 20 course places of the table and The Table. The
  registry (`COURSE`, 23 courses) maps onto them with two shared places: the
  three Titan arenas are one stadium (traced from Monster Arena) and Summit Time
  Attack is Summit Run's second course. The five secret variants are not in the
  registry and are not places: MAP-SECRETS pins them on their own courses.
- **Place ids** are the course registry ids (`titan-stadium` and `the-table` are
  the two that are not courses).
- **The "four existing legs".** The card says four; the helicopter's tables have
  six legs among the four original destinations (Woods-Snow 25, Woods-Panorama
  120, Snow-Panorama 110, Woods-Summit 160, Snow-Summit 150, Panorama-Summit 90).
  All six keep their numbers exactly (the rule would have given 30, 120, 105,
  195, 190 and 100). Every other pair follows the rule.
- **The rule** is 12 kg per km of the table distance plus 5 kg, rounded up to 5
  kg, either way round; the table distance is the plan (`at`), not the drawn
  position. Home to Pacific Canyon is 23.4 km and 290 kg. Two places at the same
  table point (the three Neon districts) are 5 kg apart.
- **Summit's truck** sells at the pump's price, 1.5 credits a kg
  (`docs/HELI_RESCUE.md` 5.4).
- **Nudges.** The drawer moved two places, the Neon Drift Trial and the
  Midnight Muscle Chase, 1.7 km and 1.9 km (under the 2 km limit) so the
  three Neon outlines, which share a table point, do not touch. Nothing else is
  moved. The test finds the closest two outlines (0.1 km or more apart).
- **Outlines** are stored centred on their place, so moving a place does not
  change the file. Tremblant Woods and Snow are the same road and have the same
  outline; Summit Run is an open road (the only one).
- **Fuel reach.** Every place is within a full tank (400 kg) of a fuel pad;
  the farthest is the Cloudbreak Skyway, 4 km north of the Alpine Serpent pump.
- **The coast** is drawn so that Pacific Canyon, High Country and Harbor &
  Highlands stand within 4 km of the sea, as section 4 says.
- **Depth lines** are the coast pushed out 1.6, 4 and 8 km (20, 100 and 500 m).
  A pilot's chart, not a survey.
- **Landing zones** are not touched here (MAP-DESTINATIONS finds them, and names
  any course where the search finds none).

## Tests

`node tools/test-pilot-map.mjs`: every course in the registry is on the map once
and the shared places are the two named; the table equals the design's; only the
two Neon districts are drawn off it, by under 2 km; every place is on the land,
the three coastal courses within 4 km of the sea; the depth lines are clear of
the coast and of each other; the regions are inside the chart and the places sit
in the regions the table says; the rivers run to the coast; every outline is 1.2
km at its longest, centred, closed (all but Summit Run) and simplified to
12-120 points; **no two outlines touch** (nor the sea, a lake or a river); the
generated file matches a fresh build; the six old legs unchanged both ways and
the rule's numbers (home to Pacific Canyon 290 kg, home to Eifel Crown 185 kg, ...)
for every other pair; every place within a full tank of a fuel pad. I broke the
data four ways to see the test fail (an outline on top of another, a course
missing, a changed rate, a 0.2 km nudge) and each was caught.

## Changed assertions (none loosened; each needs Claude's written review, rule 18)

- `tools/test-feature-flags.mjs`: the switch count 37 to 38 and `pilot-map` in the
  dev list and its message. `tools/test-wasteland-beta.mjs`: one
  `pilot-map: 'dev'` row.
- `tools/test-heli-mode.mjs`, the "no unapproved src/heli imports" guard: two
  entries for `tools/test-pilot-map.mjs` (`heli-flight` for the tank size,
  `heli-jobs` for the table legs). Permissions only.

## Sound events

None. Art: none (drawn from data).

## Checks

Run once in the cloud (Linux, no graphics), on the branch merged with the
current `integration/wasteland` (conflicts in the switch lists, the preview
launcher, the heli-mode allow-list and the beta-switch table, all "keep both"):

- `npm run build`: passes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: 417
  passed, 8 failed. All eight need the laptop and none touches the map:
  `test-course-kit`, `test-earned-cars-ui`, `test-drive-through`,
  `test-full-check`, `test-medals` (each asserts `win32` or runs `pwsh`),
  `test-salt-flats`, `test-salt-flats-art` (read
  `C:\\Users\\kyleb\\dev\\art-library`) and `test-vesper-art` (needs a local
  Blender).
- `node tools/test-pilot-map.mjs` (300 checks) and
  `node tools/build-pilot-map.mjs --check` pass.
- Not run: browser scenarios and frame checks (nothing is drawn yet).

## Removed

Nothing.
