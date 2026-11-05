# BOWL-ART-STADIUM

Status: round 2 ready for Claude's look judgement. Kind: art. Flag: none.

## Changed

- Rebuilt the stadium with deeper, less frequent seating rows, full crowd blocks, patched ramp rails and footings, a lit amber score pattern, torn banners and crushed-car dressing.
- Corrected the three review cameras to show the arena floor at truck height, the top row and the overhead layout at night. Added a review-only size truck; it is not in the GLB.
- Replaced the old round 1 sheet with one compressed comparison sheet containing both rounds at `docs/board/looks/bowl-art-stadium/round-1.jpg` (74,804 bytes). Round 2 captures and Blender's interim sheet stay in `.evidence/2026-11-05/bowl-art-stadium/round-2/`.
- The stadium GLB reads back as 37,436 triangles, 80 mesh batches and 1,947,708 bytes, inside the 80,000 triangle and 3 MB budgets.

## Checks

- Blender recipe and three night renders: passed; 37,436 triangles and 1,947,708 bytes.
- `node tools/test-blender-output.mjs`: 193 checks passed, 0 failed, including the final evidence-path adjustment.
- Final lane tier: 46 passed, 2 failed. `test-circuit-eifel` and `test-review-evidence` hit FFmpeg launch errors (`EPERM`). The review suite also could not see the new review note until it was staged; the committed file list includes the matching `round-1-review.md`. The Eifel suite's one rerun still failed on FFmpeg loudness measurement (`EPERM`). No more suite reruns.
- Build: passed with final `npm.cmd run build` (Vite 8.0.16, 632 modules). The plain `npm` PowerShell shim was blocked by execution policy before the build started.
- Browser and look judgement: Claude runs. Please judge the two-round sheet and round 2 captures in `.evidence/2026-11-05/bowl-art-stadium/round-2/`. The model is not wired into a course yet, so there is no browser scenario for this card.
- Frame check: not applicable to art. Race fingerprints: not run; no race or simulation files changed. Changed assertions: none.

## Removed

- Replaced the old round 1 JPG with the comparison sheet. Removed its separate round 1 note after carrying its scores and gaps into the comparison review note. Temporary composition files were recycled.
- No runtime dependency, network request, save data or unrelated asset was added or removed.
