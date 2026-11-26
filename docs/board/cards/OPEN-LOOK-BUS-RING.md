# OPEN-LOOK-BUS-RING

The short board entry controls current state, ownership, dependencies and locks.

**A Claude cloud session builds this, on Opus** (Kyle, 26 November 2026: run what is ready in the cloud). Cut by Claude
on 26 November 2026, day 2 of the open Scablands. Design: `docs/story/open-scablands.md` section 16.

## What to build

One file, `src/world/open/looks/bus-ring-look.js`, that draws the Bus Ring.

The Bus Ring, round 1: the camp of the tinkers, led by Gasket, who mend anything for anybody, Road Rats included.
Read `docs/story/open-scablands.md` section 16 (its row in the sites table) and the storyline page
`docs/story/threads/market-day.md` (the Bus Ring and the tinkers) for every detail; they win over this card.

- **A ring of old buses** drawn up nose to tail as a wall, some on blocks, one with its roof cut away as a workshop,
  with a gap for a gate.
- **The workshop yard** inside: a lathe and a bench under a canopy, a chain hoist on an A-frame, a car on stands half
  mended, parts sorted on shelves, a forge or a welding set with its bottles, a stove and a table where the tinkers eat.
- **What tells it from afar:** the buses' roofs in a ring catching the light, and the blue-white flicker of welding at
  dusk. Say in the change note how far each reads.

**The stages.**

| `stage` | What is drawn |
| --- | --- |
| `camp` | Everything above, by day and at dusk (the welding flicker, light in the workshop bus) |

**Named spots in the layout:** `car-stop` (where the player leaves the car), the leader's place, the meeting place, and
every place the storyline's file and the codex card building it name (`src/story/threads/content/*.js`; look on the
branches `codex/open-t-*` for spots they already use, and keep those names). Write the list in the change note.

**Pictures the scenario takes:** `far` (from the nearest road at the distance the tell is read, at dusk, car height),
`edge` (from `car-stop`, eye height 1.6 m), two views inside the camp on foot, and one at night.

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

- `BUS_RING_LAYOUT`: the site's radius and every named spot.
- `busRingSolids(stage)`: the boxes and circles a car or a walker cannot pass, in metres from the site's centre.
- `buildBusRing({stage, heightAt})`: a `THREE.Group`, with `heightAt(x, z)` giving the ground under each thing.
- `updateBusRing(group, seconds)`: the parts that move.

Add the site to the QA stand (`tools/open-look-stand.js`) as the Glasshouse and the Rats' Nest are, adding a row and
changing nothing else in it.

## Files and locks

New: `src/world/open/looks/bus-ring-look.js`, `tools/test-bus-ring-look.mjs`, `tools/scenarios/look-bus-ring.mjs` with its row
in `SCENARIO_AREAS` (`tools/run-browser-scenarios.mjs`). One row in `tools/open-look-stand.js`. No lock. The codex card
that loads the storyline places the site in play; do not edit its files.

## Checks

1. `tools/test-bus-ring-look.mjs`, with no graphics: each stage builds; draws and triangles within the budget; the layout is
   the same on two runs; every solid lies inside the radius; every named spot is clear of every solid; every string the
   scenario sends parses (`new Function`).
2. Run `look-bus-ring` in your cloud with software drawing, as the round 1 sessions of 25 November did (`docs/ART_LINE.md`,
   "A site drawn in code, stood in the open land"), look at the pictures and mend what they show before handing over.
   Say that this was done, and that Claude has not looked yet. One sheet, `docs/board/looks/open-bus-ring/round-1.jpg`
   (500 KB at most).
3. Rule 23: `node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-bus-ring-look`
   and `npm run build`.

Claude takes the pictures on the laptop and writes the verdict at the merge; round 2 is a card of its own.

## Sound cues

None. The card that places the site names its own.

## Rules for every cloud card of the open Scablands

Read `AGENTS.md` first. Work only on the branch `cloud/OPEN-LOOK-BUS-RING`, cut from `origin/integration/wasteland`. The first commit
sets this card's `claimed_by` on the board to "Claude (cloud)" with the date. Stay inside the files named here. Never
wait on a question: write it to `docs/board/questions/OPEN-LOOK-BUS-RING.md` (what needs deciding, the options, your pick), push, and
carry on with your pick. Ask Kyle nothing and leave him nothing to do. Write `docs/changes/OPEN-LOOK-BUS-RING.md` (15 lines at most,
with a **Removed** line), push, and open one pull request into `integration/wasteland` that says what was built, each
check and its result with the commit, "For Claude to run", and what is not right yet. After the pull request is open
the card is finished: do not wait for review comments. The repository is public: no key, address, account or amount of
money goes into it. Never merge, and never push `integration/wasteland` or `master`.
