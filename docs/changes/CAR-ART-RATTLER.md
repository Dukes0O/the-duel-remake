# CAR-ART-RATTLER

## Changed

- Revised `tools/blender/rattler.py` for a rounded, chopped cab and roof, open wheel arches, brighter lighting, closer framing, and five review views.
- Exported `public/assets/models/wasteland/cars/rattler.glb`: 2,136 triangles and 352,436 bytes, within the card budgets.
- Replaced the round 1 sheet with a 191,886-byte comparison JPG containing the earlier sheet and all five round 2 views. Added honest scores in the review note.

## Checks

- Blender render and GLB export passed; all five requested views rendered.
- Lane tier `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` passed: 47/47 suites. Blender output placement passed 232 checks; smoke test passed 799 checks; replay guards passed 297 checks.
- `npm.cmd run build` passed. Vite reported its dynamic-import and large-chunk warnings.
- No browser scenario or frame check was run. Claude should inspect the comparison sheet, requested views and scale figure, and compare the model with the generated photographic reference. The reference crop is not included on the sheet.
- No assertions changed. No simulation code changed; replay guards passed with unchanged fingerprints.

## Removed

- Removed the superseded round 1 sheet and review note from the current looks folder.
- Round 1 private render outputs are superseded by `.evidence/2026-11-05/CAR-ART-RATTLER/round-2/`.
