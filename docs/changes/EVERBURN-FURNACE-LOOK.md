# EVERBURN-FURNACE-LOOK, round 1

Claude, 10 November 2026. The card stays open for a second round.

## What changed

- `tools/blender/scablands-vehicles.py`: plain base colours in place of a noise texture (the exporter wrote no colour for
  it), metal at .18 or less, lighter steel, rust, ochre and black, door lights about twice the size, and
  `export_yup=False` because the parts are authored +Y up.
- `public/assets/models/wasteland/scablands/vehicles.glb`: rebuilt from the recipe (641,268 bytes; one version).
- `docs/ART_LINE.md`: the two faults and the rule to look at a piece in the game.
- `docs/board/looks/everburn-furnace/round-1.jpg`: before and after, in the game.

## Checks

- `node tools/test-scablands-scene.mjs` and `node tools/test-blender-output.mjs` (394 checks): pass.
- Browser check `everburn-well`: pass.
- Lane tier and `npm run build`: pass.
- Look (Claude): in the game, four sides at 13 m, for idle, stoke, glow and two hits.

## Sound

No new game event.

## Removed

The noise texture in the vehicle materials. The old `vehicles.glb` is replaced.

# EVERBURN-FURNACE-LOOK, round 2

Claude, 10 November 2026. Kyle's verdict on the sheet: toy-like. The card stays open; round 3 builds from photos.

## What changed

- `src/world/scablands-scene.js`: `tintArt` copies each material and darkens it once (it darkened a shared material
  once for every part, which drew rust and steel near black on all Scablands art). The flame cones at the furnace's
  front face are replaced by two tongues of fire over each door, shown only while that door glows. The plates fall by
  side: left pair, right pair, rear corner shields. The chimney smoke starts higher, over the taller chimney.
- `tools/blender/scablands-vehicles.py`: a new furnace (firebox, drum, barred doors, dome, chimney, ram); the first
  reviewed colours restored, rust and ochre a little darker. Big Bess and the thief buggy get those colours back too.
- `public/assets/models/wasteland/scablands/vehicles.glb`: rebuilt (one version).
- `tools/test-scablands-scene.mjs`: a check that a shared material is tinted once (fails without the fix), and the
  fire checks described on the card under "Changed assertion".
- `docs/ART_LINE.md`: the shared-material fault, and that box art reads as a toy.
- `docs/board/looks/everburn-furnace/`: `round-2.jpg` and a review note for each round.

## Checks

- `node tools/test-scablands-scene.mjs`: pass. Lane tier and `npm run build`: pass.
- Browser check `everburn-well`: pass.
- Look (Claude): in the game, sides, rear and from behind at 30 m, for idle, stoke, each door glowing, one and two hits.
- No frame check (rule 9).

## Sound

No new game event.

## Removed

The stand-in flame cones. The round 1 model file is replaced.

# EVERBURN-FURNACE-LOOK, round 3

Claude, 11 November 2026. The card stays open until Kyle has seen the sheet.

## What changed

- `src/world/scrap-look.js` (new): wear, flames, smoke, sparks, firelight and ground shade drawn in code.
- `src/world/scablands-scene.js`: the furnace loads from its own file; its fire, smoke, sparks and firelight use the
  new drawing code; door lights are hidden until their door glows; a broken door stays scorched.
- `tools/blender/old-smoke-photo.py` (new) and `public/assets/models/wasteland/scablands/old-smoke.glb` (869,980
  bytes): the furnace carved from four photos, kept with credits in the Scablands `textures` folder.
- `tools/blender/scablands-vehicles.py` and `vehicles.glb`: Big Bess and the thief buggy only (329,404 bytes).
- `tools/test-scablands-scene.mjs`, `tools/test-blender-output.mjs`: the furnace's own file; changed assertions are
  reviewed on the card.
- `docs/ART_LINE.md`: photos for surfaces and code for effects, the route test's scores, three new faults.
- `docs/WASTELAND_WORLD.md`: the model table. `docs/board/looks/everburn-furnace/round-3.jpg` and its note.

## Checks

- `node tools/test-scablands-scene.mjs`, `node tools/test-blender-output.mjs` (397 checks): pass.
- Lane tier, `npm run build`, browser check `everburn-well`: see the run log line for this merge.
- Look (Claude): in the game, sides, front, rear and from behind at 30 m, for idle, stoke, each door glowing, one
  and two hits.
- No frame check (rule 9). One is needed before the story goes live.

## Sound

No new game event.

## Removed

The box furnace: `smoke()` in `scablands-vehicles.py`, its parts in `vehicles.glb`, and the round 2 sphere smoke and
cone flames in the scene.

# Big Bess from photos, and the Lab's look round 1

Claude, 11 November 2026, with Sonnet helpers and Codex's image tool.

## What changed

- `tools/blender/big-bess-photo.py`, `public/assets/models/wasteland/scablands/big-bess.glb` and four photos in the
  Scablands `textures` folder (credited): Big Bess carved from photos by a Sonnet helper.
- `src/world/scablands-scene.js`: Big Bess has her own file and her own rig, which follows the escort in Everburn
  job 4; wheels turn, exhaust and road dust are drawn. `src/world/scrap-look.js`: `createDustTrail`.
- `src/world/jobs/everburn.js`: the big-bess actor has `renderCar:false`; no rule, speed, health or path changed.
- Removed: `tools/blender/scablands-vehicles.py` and `vehicles.glb` (the unused thief buggy with them).
- `src/lab/classroom/board-art.js` and `src/lab/lessons/lift-board.js`: the Lab's look, round 1 (card LAB-LOOK).
- `docs/board/cards/LAB-LOOK.md`, two board entries, `docs/ART_LINE.md` (four carving faults and the route test's
  result), `docs/WASTELAND_WORLD.md`, two look sheets with notes.

## Checks

- Scene test, model tests (397 checks), the Lab lesson tests: pass. Lane tier and build: see the run log.
- Browser: `everburn-well` passes; all 16 `lab-classroom` scenarios pass with the new art.
- Look (Claude): Big Bess and the furnace moving, in the game; every lesson's board on one sheet.

## Sound

No new game event. Big Bess has no engine sound of her own in job 4; that was true of the stand-in car's place too.

## Removed

The stand-in sports car for Big Bess; the box-art vehicles recipe and model; the Lab's brushed-steel board
background and outline helicopter and car.
