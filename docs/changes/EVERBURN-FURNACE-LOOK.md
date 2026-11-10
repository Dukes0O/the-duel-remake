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
