# BOWL-ART-CRUSH ? round 2

Status: Blender art round submitted for Claude's judgment.

## Changed

Rebuilt `tools/blender/bowl-crush.py` with named vehicle body, glass, wheel and frame meshes under one root. The recipe adds whole and collapsed van, bus and RV forms, a scorched crushed-bus heap, flat dirt, uneven rust and steel materials, and shaped flames. Blender's Y-up design axes are mapped into its Z-up render space. The existing Titan model appears in review renders only; it is not included in the obstacle GLB.

Rebuilt `public/assets/models/wasteland/bowl/crush.glb`: 934,364 bytes and 15,254 triangles, within the 1 MB and 20,000-triangle limits. Replaced the standalone round 1 sheet with `docs/board/looks/bowl-art-crush/round-2.jpg`, a 66,682-byte comparison sheet. It shows round 1 on top and four round 2 Blender views below. The round 1 scores and findings are carried into `round-2-review.md`. Raw views stay under `.evidence/`.

Builder visual scores are estimates, not Claude's verdict: outline/distinction 2/5, wear/detail 3/5, crushed shape 3/5, fire/heap 2/5, grounding/scale 3/5. Game-distance readability and frame cost are unmeasured. The note lists the remaining art gaps and does not claim a pass.

## Checks

- Blender 4.5.13 LTS render and export: passed; four PNG views saved in `.evidence/2026-11-05/BOWL-ART-CRUSH/round-2/`.
- `node tools/test-blender-output.mjs`: passed, 193 checks; GLB budget passed.
- `node tools/test-repo-hygiene.mjs`: passed; no oversized look sheets.
- Lane tier: all 48 suite results were written. Two suites reported FFmpeg `EPERM`: `test-circuit-eifel.mjs` (17/18 checks passed) and `test-review-evidence.mjs` (fixed review-note pairing, then 8/9 checks passed on direct rerun). The Eifel suite rerun also failed at the same FFmpeg loudness call. Other suites in the lane output passed. The lane process stayed open after printing the suite results; it was interrupted, so it produced no final runner summary. No assertions changed.
- `npm.cmd run build`: passed. Vite reported existing dynamic-import and large-chunk warnings.
- Replay guard in the lane output: passed, 297 checks. This is art-only; no race fingerprints changed or were recaptured.
- Browser and in-game look checks: not run here. Claude should judge the comparison sheet and run the browser look check when the Bowl scene is wired. No frame check was run.

## Removed

Replaced the separate round 1 sheet and note with the comparison sheet and one review note that carries forward round 1's scores and findings. No tests, assertions, game code or runtime dependencies were removed or changed.
