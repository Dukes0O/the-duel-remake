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
