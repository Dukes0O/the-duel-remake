# TOWN-ART-STAGES

## Changed

- Added `tools/blender/town-stages.py` and the candidate `stages.glb` with the four scaffold stages, four rubble heaps, four burnt frames and eleven street props. The recipe reuses `town_base.py` materials and construction helpers. The model is not wired into gameplay.
- Registered the candidate in `tools/test-blender-output.mjs` and checked its family root, every building id, triangle count and 3,000,000-byte file limit.
- Added [round-1.jpg](../board/looks/town-art-stages/round-1.jpg) (190,458 bytes) and its review. It compares a photographic scaffold reference with the Blender render. The reference prompt and material prompt are recorded in the review note. The generated images remain outside the repository; the material image is not used by this candidate.

## Checks

- Blender recipe/render: completed. Candidate GLB: 2,954,100 bytes. Render inspected at full size. The family is inside the overall triangle allowance; see the Blender output check for the exact count.
- `node tools/test-blender-output.mjs`: pass, 238 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: pass; repository placement clean. Size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8/9 subtests pass on the isolated rerun. The audio-analysis subtest fails because `ffmpeg` returns `EPERM`; it is unrelated to this art card.
- Lane tier: pass, `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`. Replay fingerprints: 297 checks passed, unchanged.
- `npm.cmd run build`: pass. Vite reported existing chunk-size and ineffective-dynamic-import warnings.
- Browser/look check: not run in this lane. Claude should inspect `round-1.jpg`, especially whether the scaffold silhouette and its hand-built details are clear from the mayor's camera.
- Changed assertion: candidate size check now uses each generator's declared `maxBytes` (default remains 2,500,000); this card sets 3,000,000, matching its written file budget. No threshold was loosened beyond the card contract.
- Race fingerprints: unchanged; no simulation code changed.

## Review result

This is an honest but weak comparison. My scores are material 3/5, proportions 2/5, build detail 2/5 and stage readability 2/5. The render still reads too much like an open scaffold frame, and the ladder/hoist are not clear enough. I do not consider the art ready to pass. Claude should judge the sheet and decide if the scaffold layout merits another round.

## Removed

- Removed no existing source or runtime asset. Deleted the lane's temporary Python cache. Raw Blender render and logs remain temporary and are not committed.
