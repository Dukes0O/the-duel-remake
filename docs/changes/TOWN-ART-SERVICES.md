# TOWN-ART-SERVICES change note

## What changed

Added one 3×2 motor-pool building to `services.glb`, with a photo-carved tin shed, an open front, dark interior, floor, inspection pit, tool racks and four fuel drums. Added four generated orthographic JPG references and the round-5 comparison sheet.

The four photos were generated with OpenAI image generation and credited in `round-5-review.md`. Earlier accepted buildings' recipes were left untouched. The service family is re-exported from the existing recipe.

## Checks

- Blender 4.5.13 recipe and export render: passed. Bounds were printed for every motor-pool mesh. The post-fit plot assertion and piece contact audit passed.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 567 checks, 8 passed and 1 failed. The unrelated audio-analysis check failed twice with `spawnSync ffmpeg EPERM`; the image and review-sheet checks passed.
- Browser check: not run; Claude owns browser and look checks for this art card. See `round-5-review.md` for the specific look questions.
- Changed assertions: none. Replay fingerprints: not applicable; no race code changed.

## Removed

None.


