# BOWL-ART-CRUSH — round 3

Status: final art round submitted for Claude's judgment; visual acceptance remains unresolved.

## Changed

Updated `tools/blender/bowl-crush.py` for the last art round. The review floor is now horizontal, and the Titan stays at its authored scale with its imported wheel/body hierarchy intact. Crushed vehicle bodies use uneven roof stations, and the van, bus and RV have distinct faded paint. The burning pile uses the game's crushable junk-car dimensions (2.12 × 1.30 × 4.50 m) and colors from `src/course.js`; the game supplies collision boxes, not reusable 3D junk-car meshes.

Rebuilt `public/assets/models/wasteland/bowl/crush.glb`: 958,136 bytes and 15,282 triangles, within 1 MB and 20,000 triangles. Replaced the round 2 sheet with `docs/board/looks/bowl-art-crush/round-3.jpg` (100,378 bytes), which compares all three rounds. The round 3 note carries forward prior scores and states the remaining visual gaps.

The final views still read as low box-like forms. The vehicles are hard to distinguish at distance, and the fire pile looks like stacked boxes with narrow flames. Round 3 is not a pass recommendation. The look note lists what Claude should judge.

## Checks

- Blender 4.5.13 LTS render and GLB export: passed; four PNG views saved under `.evidence/2026-11-05/BOWL-ART-CRUSH/round-3/`.
- `node tools/test-blender-output.mjs`: passed, 193 checks; Blender output size and triangle budgets passed.
- `node tools/test-repo-hygiene.mjs`: passed; no placement failures or oversized look sheets.
- Lane tier (`--tier lane --changed --jobs 4 --keep-going`): 46 of 48 suites passed; `test-circuit-eifel.mjs` and `test-review-evidence.mjs` failed on FFmpeg `EPERM`. Each suite was rerun once alone and failed on the same FFmpeg access issue. Replay guard passed, 297 checks. The runner stayed open after printing all suite and replay results; it was stopped without a final runner summary. No game code or test assertion changed.
- `npm run build`: passed; existing dynamic-import and large-chunk warnings remain.
- Browser and in-game look checks: Claude runs these when the Bowl scene is wired. No frame check was run.
- Race fingerprints: none apply; no simulation code changed. No test assertions changed.

## Removed

Replaced `round-2.jpg` and `round-2-review.md` with the final three-round comparison sheet and `round-3-review.md`. No tests, assertions, game code or runtime dependencies were removed or changed.
