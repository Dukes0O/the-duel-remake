# OPEN-LOOK-GLASSHOUSE

The short board entry controls current state, ownership, dependencies and locks.

**A Claude cloud session builds this, on Fable** (Kyle, 25 November 2026: two days of work on the open Scablands, mostly
in the cloud). Design: `docs/story/open-scablands.md` sections 16 and 21 (Scenes 1 and 2, and "What it needs made").

## What to build

The Glasshouse, round 1: the camp of Marigold's nine growers, who raise beans under old car windscreens. One file,
`src/world/open/looks/glasshouse-look.js`, that draws it at three stages.

**The camp, about 45 m across.**

- **Six bean rows, each about 12 m long,** with windscreens propped over them on stakes as cold frames: about fifty
  screens of three or four makes, each curved as a real one is, some cracked, some mended with tape. Bean plants show
  green under the glass. This green and the glass are what a player sees first.
- **A wind pump** about 6 m tall: a tower of scaffold tube, a wheel of eight tin blades cut from bonnets, a tail vane, a
  pump rod and a trough. The wheel turns.
- **A store tent:** a tarpaulin over poles, 4 m by 3 m, with sacks and crates inside.
- **A stove** that burns bean stalks, with thin pale smoke. This is the camp's tell at dusk.
- **The water cart:** small, three-wheeled and motor-driven, with a drum of about 400 litres. Finch, who is twelve,
  drives it.
- **Three sleeping shelters** made of car bench seats and tarpaulins, a washing line, hoes, and a bird-scarer of
  hubcaps on a pole.

**The three stages.**

| `stage` | What is drawn |
| --- | --- |
| `camp` | Everything above, whole |
| `burned`, with `fresh: true` | Section 21, Scene 2. The frames are smashed and tyre marks run straight down the bean rows. The store tent is ash on its poles, with a broken car lamp in the ash. The cart is gone. Many narrow tyre tracks leave to the south-east, with two deep ruts beside them and small footprints between. A green bean pod lies on the track, another twenty steps on, and another. The pump still turns |
| `burned`, with `fresh: false` | Two nights later: the tracks, the ruts and the pods are gone. The lamp, the frames and the pump are left |

**Named spots in the layout:** `car-stop` (the edge of the camp, where the player gets out), the six things to find
(`frames`, `lamp`, `tracks`, `ruts`, `pods`, `pump`), `stove`, `tent`, `cart`, `marigold` (where she stands, hands on
hips), three `hoe-*` spots among the rows, and `tracks-away` (a point 60 m out on the line the buggies took).

**The glint.** From far off, in daylight, glass sometimes catches the sun. Give `updateGlasshouse` a sun direction and
let two or three screens flash for a moment when the angle is right. This is the camp's second tell.

**Where the scenario stands it:** at the first position of the Glasshouse in "Claude answers" of
`docs/board/cards/OPEN-SITES.md`.

**Pictures the scenario takes,** for `camp` and again for `burned` with `fresh: true`: `far` (from the nearest road, at
dusk, car height), `edge` (from `car-stop`, eye height 1.6 m), `rows` (on foot between two rows), `pump` (the pump from
8 m). And one more of `burned`: `clues`, looking down the track from `ruts` towards `tracks-away`.

## Files and locks

New: `src/world/open/looks/glasshouse-look.js`, `tools/test-glasshouse-look.mjs`,
`tools/scenarios/look-glasshouse.mjs`. No lock. OPEN-SITES and OPEN-THREADS place and use what this file gives; do not
edit their files.

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

- `GLASSHOUSE_LAYOUT`: the site's radius and every named spot below.
- `glasshouseSolids(stage)`: the boxes and circles a car or a walker cannot pass, in the same metres.
- `buildGlasshouse({stage, heightAt})`: a `THREE.Group`, with `heightAt(x, z)` giving the ground under each thing.
- `updateGlasshouse(group, seconds)`: the parts that move.

## Checks

1. `tools/test-glasshouse-look.mjs`, with no graphics: each stage builds; draws and triangles are within the budget; the
   layout is the same on two runs; every solid lies inside the radius; every named spot is clear of every solid.
2. `tools/scenarios/look-glasshouse.mjs`, for the laptop: it stands the site in the Scablands at the position named
   below and takes the pictures listed below, by name. Copy the form of `tools/scenarios/scablands-things.mjs`. Prove
   that each string it sends to the page parses (`new Function`). If the page offers a scenario no way to add a group
   to the scene, add the smallest one behind the switch `story-choices` in a file of your own, and write it under
   "Cloud decided (Claude to review)" in the pull request.
3. Rule 23: `node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-glasshouse-look`
   and `npm run build`.

Nobody has looked at any of it when this card hands over, and the pull request says so. Claude takes the pictures on
the laptop and writes the verdict in `docs/board/looks/open-sites/`; round 2 is a card of its own.

## Sound cues

None. The cards that place the site name their own.

## Rules for every cloud card of the open Scablands

Read `AGENTS.md` first. Work only on the branch `cloud/OPEN-LOOK-GLASSHOUSE`, cut from `origin/integration/wasteland`. The first
commit sets this card's `claimed_by` on the board to "Claude (cloud)" with the date. Stay inside the files named here.
Never wait on a question: write it to `docs/board/questions/OPEN-LOOK-GLASSHOUSE.md` (what needs deciding, the options, your pick),
push, and carry on with your pick. Ask Kyle nothing and leave him nothing to do. Write `docs/changes/OPEN-LOOK-GLASSHOUSE.md` (15
lines at most, with a **Removed** line), push, and open one pull request into `integration/wasteland` that says what
was built, each check and its result with the commit, "For Claude to run", and what is not right yet. Then watch the
pull request for review comments and act on them. The repository is public: no key, address, account or amount of money
goes into it. Never merge, and never push `integration/wasteland` or `master`.
