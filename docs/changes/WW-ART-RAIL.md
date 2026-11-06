# WW-ART-RAIL

Card still open: the engine and its drift have passed; the carriages, van, Wednesday and the props follow.

## Changed

- `tools/blender/photo_model.py`: a new kit for building models from a photo's own outline: sky masks, outline tracing with holes, slabs, boxes with a measured picture rectangle per face, and lathes whose faces wear the picture they were read from.
- `tools/blender/rail-trains.py`: rebuilt on that kit: `the-2-15-engine`, `the-2-15-track` and `the-2-15-drift`, in one GLB.
- `docs/ASSET_PIPELINE.md`: how to use the kit.

## Checks

- Blender 4.5.13 recipe: 13,354 triangles, 1,971,248 bytes, read back; rendered from the exported GLB in an empty scene.
- `node tools/test-blender-output.mjs` and `node tools/test-repo-hygiene.mjs`: passed. Art look: Claude, see `docs/board/looks/ww-art-rail/round-3-review.md`.
- Lane tier and `npm run build`: passed on 6689d50a.

## Changed assertions

`tools/test-blender-output.mjs`: `photo_model.py` joins `town_base.py` in the list of shared helpers that are not asset generators. It makes no GLB of its own; nothing is loosened. Claude's review.

## Race fingerprints

None: not wired into the game.

## Removed

The round 1 and 2 recipe, sheets and notes.

## Carriage slice

- Added the 14 m passenger carriage as `the-2-15-carriage`, with two four-wheel bogies, open doors, empty windows, a dark interior, curved canvas roof and end buffers. Its side, end and roof pictures are credited in the rail texture credits.
- Raised only the `ww-art-rail` GLB budget to the card's stated 80,000 triangles and 5 MB.
- Blender 4.5.13 exported and re-imported the GLB for the side, end and two three-quarter views. The carriage has 4,200 triangles. The engine, track and drift recipes and nodes are unchanged.
- `node tools/test-blender-output.mjs`: passed, 275 checks, 0 failed. `node tools/test-repo-hygiene.mjs`: passed; size targets reported as advisory.
- Side and end renders were compared beside their photos. The passenger carriage passes my look check from the side and three-quarter views. Chrome checks are for Claude. The van proceeds because this piece passed.
- Changed assertions: none. The budget entry changed to the card's stated limit; no test assertion was loosened.
- Race fingerprints: none; this is not wired into the game.
- Removed: the empty temporary PNG and transient image-transfer file created during photo import. The review sheet will contain only the accepted carriage and van views.
