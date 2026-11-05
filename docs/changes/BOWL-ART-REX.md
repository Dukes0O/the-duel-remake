# BOWL-ART-REX — round 2

**Status:** Round 2 ready for Claude's look verdict. **Kind:** art asset. **Flag:** none; the model is not wired into gameplay.

The recipe now builds a longer skull with an open toothed jaw, a thick neck, four heavy legs, and a longer swaying tail. The rail frame and wheels sit behind a continuous salvaged side skin. Three named battery boxes keep whole and smashed states, with hazard paint and bright cables. The rendered views use the actual Titan model for scale only; it is excluded from the exported asset.

## Evidence

- Blender 4.5.13 rendered five views: front, three-quarter, side at rest, side biting, and top. The side views show the jaw and tail poses. Raw PNGs are in `.evidence/2026-11-05/BOWL-ART-REX/round-2/`.
- The comparison sheet is `docs/board/looks/bowl-art-rex/round-1.jpg`: round 1 on the left and round 2 on the right. It is 169,594 bytes, below 500 KB. The paired note records builder scores and asks Claude to judge the remaining squared torso and material finish.
- GLB readback: 18,328 triangles and 1,554,020 bytes (limits: 60,000 triangles and 2.5 MB).

## Checks

- `node tools/test-blender-output.mjs`: passed, 193 checks.
- `node tools/test-repo-hygiene.mjs`: passed.
- Changed-file lane tier: 45 passed, 2 failed, 0 not run. `tools/test-circuit-eifel.mjs` failed its FFmpeg loudness measurement; its one rerun still failed there (17 passed, 1 failed). `tools/test-review-evidence.mjs` initially failed because the old sheet path was absent and FFmpeg could not start; after restoring the final comparison at the recognized `round-1.jpg` path, its one rerun passed the sheet checks but still failed the FFmpeg audio-analysis case (`spawnSync ffmpeg EPERM`, 8 passed, 1 failed). No assertions were changed or weakened.
- `npm.cmd run build`: passed. Vite reported its existing chunk-size and dynamic-import warnings.
- Browser scenario: none; this candidate is not wired into the game. Claude should review the comparison sheet, especially the side silhouette, jaw/tail poses, battery targets from the Titan, and the remaining boxy body.
- Replay fingerprints: the lane replay suite passed 297 checks across 33 cases and three frame rates. This art change does not alter race rules.

## Changed assertions

None. The Blender output registry now asks this recipe for round 2; all model budgets and existing test assertions stay unchanged.

## Removed

Replaced the round 1-only JPG and its review note with a single two-round comparison JPG and updated review note at the existing recognized paths. Recycled the temporary alternative sheet and generated scratch artifacts. No runtime asset was replaced outside this card.
