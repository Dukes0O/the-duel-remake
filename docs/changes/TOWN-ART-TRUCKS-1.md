# TOWN-ART-TRUCKS-1 change note

Round 4 reduces repeated wheel tread and low-detail round hardware, batches static parts, and uses four distinct generated 512 by 512 JPEG paint pictures. The exported GLB is 2,463,052 bytes. The recipe reports evaluated triangles and each image's dimensions and byte size by truck, and stops if a truck exceeds 15,000 triangles. Counts: fire 10,056; tanker 10,160; supply 7,142; tow 7,252. The round 4 sheet compares reference photos with renders imported from the exported GLB in an empty scene.

The shared 1K PNG atlas assertion in `tools/test-blender-output.mjs` changed to require four unique embedded JPEGs, matching the card's photo-material design and the renderer's standalone image export. This does not loosen any size, node, or triangle assertion. The steering-pivot check also exposed an offset in the recipe; the pivot was corrected. The recipe now writes its editable `.blend` under ignored `art-build/` and its path plan points at the private candidate path.

## Checks

- `node tools/test-blender-output.mjs` — 238 checks passed; 1 failed. The remaining candidate guard rejects `public/assets/models/wasteland/town/trucks-1.glb` because this task requires committing the model at that card path before Claude's art review. The guard and its assertion were left unchanged.
- `node tools/test-repo-hygiene.mjs` — passed; repository placement is clean.
- Blender recipe and empty-scene GLB renders — passed; per-truck counts and image dimensions are printed by the recipe.
- Browser and in-game look checks — not run; Claude should review the remaining angular panels and weaker tanker, supply and tow surface wear shown in `docs/board/looks/town-art-trucks-1/round-4.jpg`.
- Race fingerprints — not applicable; the model is not wired into the game.

## Removed

- Deleted obsolete round 1 and round 2 comparison sheets and notes as requested.
- Removed this run's temporary Blender renders, test logs and Python bytecode before commit.
- No model, paint image or required recipe was removed.
