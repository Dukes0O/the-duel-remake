# TOWN-ART-BASE change note

## Changed

- Added `tools/blender/town_base.py`, a shared 1K packed wear atlas, metre-based construction helpers, corrugated and pitched roof panels, scaffold, pipe, weld, rivet, sign, washing, sandbag, drum and tyre helpers, and footprint and Y-up export helpers.
- Added `tools/blender/town-sample.py` for the 1x1 shack and 3x2 workshop proof, with scale proxies and the 8 m grid.
- Added `tools/blender/town-sheet.py` for two labelled views per building and one JPG at or below 500 KB.
- Registered the sample recipe and sheet in `tools/test-blender-output.mjs`.
- Generated `public/assets/models/wasteland/town/sample.glb` for the render proof: 2,458,212 bytes. The sample is not wired into the game. Following the task brief, it will not be committed as a generated runtime model; the recipe recreates it for review. A later real town-family card should remove this temporary sample path when it replaces the proof.

## Checks

- Python syntax parse: passed for all three recipes.
- Blender 4.5.13 sample generation, four renders and GLB export: passed. One final round-one comparison sheet was created at 157,964 bytes.
- `test-blender-output.mjs`: pending.
- Lane tier: pending.
- `npm run build`: pending.
- Browser and in-game look check: Claude should inspect the single sheet in `docs/board/looks/town-art-base/round-1.jpg`; no browser or frame check was run.
- Changed assertions: none.
- Race fingerprints: no race code changed; none recorded.

## Removed

- No existing recipe or runtime asset was replaced. The generated sample GLB is temporary art evidence because the game does not load it; it will be removed from `public/` before commit. The recipe remains the reproducible source.
