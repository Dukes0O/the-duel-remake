# WW-ART-RAIL

Card still open: the engine and its drift have passed; the carriages, van, Wednesday and the props follow.

## Changed

- `tools/blender/photo_model.py`: a new kit for building models from a photo's own outline: sky masks, outline tracing with holes, slabs, boxes with a measured picture rectangle per face, and lathes whose faces wear the picture they were read from.
- `tools/blender/rail-trains.py`: rebuilt on that kit: `the-2-15-engine`, `the-2-15-track` and `the-2-15-drift`, in one GLB.
- `docs/ASSET_PIPELINE.md`: how to use the kit.

## Checks

- Blender 4.5.13 recipe: 13,354 triangles, 1,971,248 bytes, read back; rendered from the exported GLB in an empty scene.
- `node tools/test-blender-output.mjs` and `node tools/test-repo-hygiene.mjs`: passed. Art look: Claude, see `docs/board/looks/ww-art-rail/round-3-review.md`.
- Lane tier and build: recorded at merge.

## Changed assertions

`tools/test-blender-output.mjs`: `photo_model.py` joins `town_base.py` in the list of shared helpers that are not asset generators. It makes no GLB of its own; nothing is loosened. Claude's review.

## Race fingerprints

None: not wired into the game.

## Removed

The round 1 and 2 recipe, sheets and notes.
