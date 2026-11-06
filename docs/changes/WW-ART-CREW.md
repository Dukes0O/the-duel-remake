# WW-ART-CREW

Card still open: the harpoon, the piano and Gerald have passed. The other props follow.

## Changed

- `tools/blender/crew-favours.py`: rewritten on the photo kit by Claude: `jax-harpoon`, `piano-upright` and `gerald`.
- `tools/blender/photo_model.py`: adds `Photo.bleed`, which replaces a photo's background with the subject's own nearby colours so that it cannot show on a model's edge, and `shrink`. Existing functions are unchanged.
- `public/assets/models/wasteland/scablands/textures/`: `ww-gerald-cutout.jpg` is added; see Removed.

## Checks

- Blender 4.5 recipe: 6,804 triangles, 1,088,536 bytes, read back; rendered from the exported GLB in an empty scene. Budget 40,000 triangles, 2 MB.
- `node tools/test-blender-output.mjs` and `node tools/test-repo-hygiene.mjs`: passed. Art look: Claude, see `docs/board/looks/ww-art-crew/round-5-review.md`.
- Lane tier and build: recorded at merge.

## Changed assertions

None.

## Race fingerprints

None: not wired into the game.

## Removed

`ww-gerald-photo.jpg`, `ww-gerald-side.jpg`, `ww-gerald-overhead-mask.png`, `ww-gerald-side-mask.png`, the earlier recipes and the round 4 sheet and note.
