# BOWL-ART-CRUSH

Status: one art round complete; awaiting Claude's look verdict.

## Design

Built original van, bus, RV and burning two-bus stack props using Blender with worn steel, oxide paint, soot and rubber materials. The recipe exports the Bowl crush GLB. It is not wired into a game scene in this card. Round 1 sheet and honest preliminary scores are in `docs/board/looks/bowl-art-crush/round-1.jpg` and its adjacent note. The note flags boxy forms and artificial-looking flames for Claude's review.

## Checks

- `node tools/test-blender-output.mjs`: passed, 193 checks, including Blender-free path planning and GLB file/triangle budgets (12,564 triangles; 648,200 bytes, read from the exported file). The initial run exposed an early `bpy` import in the paths-only mode; the recipe was corrected and the same suite passed on rerun.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`: all 48 selected suites completed green; the appended replay fingerprints (297 checks) and test-runner checks passed. The runner did not return its final summary after the last output and was stopped as hung. Treat the command-level lane gate as incomplete.
- `npm.cmd run build`: passed (Vite build). Existing dynamic-import and large-chunk warnings remain.
- Browser/game check: not applicable because this card does not wire the model into a scene; Claude runs browser checks after wiring.
- No frame check (art card).
- Assertions added: one GLB budget check for this model. No existing assertions or tolerances changed.
- Race fingerprints: not applicable; no race code changed.

## Removed

None.

## Claude review

Please judge the round sheet, especially the silhouettes, deformation, rust/wear, and fire treatment. The score note identifies visual gaps; no in-game resemblance, grounding, readability or frame-cost pass is claimed. Browser review is not needed for this unwired asset.
