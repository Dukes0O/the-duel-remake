# OPEN-LOOK-RATS-NEST

The short board entry controls current state, ownership, dependencies and locks.

**A Claude cloud session builds this, on Fable** (Kyle, 25 November 2026: two days of work on the open Scablands, mostly
in the cloud). Design: `docs/story/open-scablands.md` sections 16 and 21 (Scenes 3 and 4, and "What it needs made").

## What to build

The Rats' Nest, round 1: the Road Rats' home in a cutting in the wreck fields, as the player first sees it from the
rim in Scene 3. One file, `src/world/open/looks/rats-nest-look.js`.

**The cutting.** About 90 m long, 45 m wide and 9 m deep, with steep sides, a rim a person can walk along and one road
that comes down into it at the west end. Give the shape as a plain function, `ratsNestGround(x, z)`, that returns how
far the ground lies below the land around it, in metres. OPEN-BURNED-SCOUT joins it to the land's ground. Draw the
cutting's walls as cut earth and rubble with wrecks bedded in them.

**In it.**

- **The pen, at the north end:** a ring of wrecked cars about 14 m across, with a chained gate. Nine people sit inside
  it; give nine `captive-*` spots.
- **The Glasshouse's water cart, in the middle,** with glass frames stacked on it. Use the cart's shape from the
  Glasshouse card if it has merged; if not, draw a plain three-wheeled cart with a drum and say so.
- **Six bays for buggies, in a row at the south end.** The buggies are the riders' cars and are placed by another
  card; give six `buggy-*` spots and mark the bays on the ground with oil and tyre marks.
- **Tin roofs:** four or five lean-tos and one larger shack, Sump's, with a car bonnet on trestles outside it for a
  table. A ransom is poured out on that bonnet.
- **Three tyre fires,** each a stack of burning tyres with black smoke that leans with the wind. The smoke is the
  Nest's tell from far off.
- **The drain:** a concrete pipe as tall as a man (1.8 m) under the east wall, 30 m long, that comes out in a gully
  beyond the rim. Give `drain-in`, `drain-out` and a `drain-guard` spot for one guard with a lamp.

Wrecks come from `src/world/boneyard-wrecks.js`, and shack pieces from what `src/world/tin-town-shacks.js` offers. Do
not edit either file; if one does not give what is needed, draw the piece here.

**Named spots in the layout:** `rim-north`, `rim-middle` and `rim-south` (the three places to look from, each with a
`looksAt` point: the pen, the cart, and the buggies with the drain), `car-hollow` (where the player leaves the car,
out of sight of the rim), `road-top` and `road-foot`, `pen-gate`, `sump`, and the spots named above.

**Two stages:** `day` and `night`. At night the tyre fires and two or three lamps light the yard.

**Where the scenario stands it:** at the position of the Rats' Nest in "Claude answers" of
`docs/board/cards/OPEN-SITES.md`. If that card gives none, stand it in the wreck fields 900 m east of the Boneyard and
say so.

**Pictures the scenario takes:** `rim-north`, `rim-middle` and `rim-south`, each from its spot at eye height 1.6 m
towards its `looksAt`, by day; `road-down` (from `road-top` at car height, at night); `drain` (the drain's mouth from
10 m, by day); `yard` (from `pen-gate` across the yard, at night); `far` (from 1.2 km to the west at car height, by
day, for the smoke).

## Files and locks

New: `src/world/open/looks/rats-nest-look.js`, `tools/test-rats-nest-look.mjs`,
`tools/scenarios/look-rats-nest.mjs`. No lock. OPEN-BURNED-SCOUT places and uses what this file gives; do not edit its
files, `src/world/ground-edit.js` or `src/world/scablands-solids.js`.

## How it is made

Drawn in code (Kyle, 11 November 2026: draw in code before model files, because box art reads as toys). Read
`docs/ART_LINE.md`, the reviews under `docs/board/looks/wasteland-art-direction/`, and `src/world/tin-town-shacks.js`,
which is the example of the method. Materials come from `src/world/scrap-look.js`; smoke from
`src/world/smoke-column.js` and `createSmokeMaterial`.

- **Gritty and never toy-like.** Real sizes in metres. Thin sections where the real thing is thin: tube, sheet, rope,
  wire, glass. Things lean, sag and are mended. Nothing is a plain box, and nothing is brightly coloured.
- **A fixed layout.** The layout is a list worked out once from a fixed seeded sequence, so it is the same on every run
  and its solids can be listed before anything is drawn. Positions are in metres from the site's centre, x to the east,
  z to the south, y up from the ground.
- **View only.** Nothing here changes race state, reads a save or uses the clock of the wall.
- **Small.** At most 12 draws and 60,000 triangles for the whole site at any stage, with merged geometry. No new image
  files; a texture is made in code.

## What the file gives the cards that use it

- `RATS_NEST_LAYOUT`: the site's radius and every named spot below.
- `ratsNestSolids(stage)`: the boxes and circles a car or a walker cannot pass, in the same metres.
- `buildRatsNest({stage, heightAt})`: a `THREE.Group`, with `heightAt(x, z)` giving the ground under each thing.
- `updateRatsNest(group, seconds)`: the parts that move.

## Checks

1. `tools/test-rats-nest-look.mjs`, with no graphics: each stage builds; draws and triangles are within the budget; the
   layout is the same on two runs; every solid lies inside the radius; every named spot is clear of every solid.
2. `tools/scenarios/look-rats-nest.mjs`, for the laptop: it stands the site in the Scablands at the position named
   below and takes the pictures listed below, by name. Copy the form of `tools/scenarios/scablands-things.mjs`. Prove
   that each string it sends to the page parses (`new Function`). If the page offers a scenario no way to add a group
   to the scene, add the smallest one behind the switch `story-choices` in a file of your own, and write it under
   "Cloud decided (Claude to review)" in the pull request.
3. Rule 23: `node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-rats-nest-look`
   and `npm run build`.

Nobody has looked at any of it when this card hands over, and the pull request says so. Claude takes the pictures on
the laptop and writes the verdict in `docs/board/looks/open-sites/`; round 2 is a card of its own.

## Sound cues

None. The cards that place the site name their own.

## Rules for every cloud card of the open Scablands

Read `AGENTS.md` first. Work only on the branch `cloud/OPEN-LOOK-RATS-NEST`, cut from `origin/integration/wasteland`. The first
commit sets this card's `claimed_by` on the board to "Claude (cloud)" with the date. Stay inside the files named here.
Never wait on a question: write it to `docs/board/questions/OPEN-LOOK-RATS-NEST.md` (what needs deciding, the options, your pick),
push, and carry on with your pick. Ask Kyle nothing and leave him nothing to do. Write `docs/changes/OPEN-LOOK-RATS-NEST.md` (15
lines at most, with a **Removed** line), push, and open one pull request into `integration/wasteland` that says what
was built, each check and its result with the commit, "For Claude to run", and what is not right yet. Then watch the
pull request for review comments and act on them. The repository is public: no key, address, account or amount of money
goes into it. Never merge, and never push `integration/wasteland` or `master`.
