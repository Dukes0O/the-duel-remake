# BOWL-ART-TRUCKS

## Changed

- Added `tools/blender/bowl-trucks.py` for five socket-fitted, separately named Titan Monster bolt-on sets: Rust Rhino horns, Big Kettle boiler and stack, Tin Lizard tail, Old Bess tanks, and Dragon Wagon stacks. The recipe uses original low-poly fabricated parts and worn steel colors. The review render reuses the shipped Titan body; the output contains only the bolt-ons.
- Added the recipe to `tools/test-blender-output.mjs`. It checks the Blender-free path plan and, when a private candidate GLB is present in `.qa-dist`, verifies its five rival groups, 8,000-triangle per-truck cap, and 1 MB file cap. The model is not yet wired into the game, so it remains an art candidate outside the commit.
- Added the round 1 sheet and score note under `docs/board/looks/bowl-art-trucks/`.

## Checks

- Blender 4.5.13 generated the GLB and rendered front three-quarter, side and rear three-quarter views for all five variants. GLB measured 337,312 bytes. Triangle counts read from that GLB: Rust Rhino 516; Big Kettle 1,292; Tin Lizard 692; Old Bess 676; Dragon Wagon 932. Each is below 8,000.
- `node tools/test-blender-output.mjs`: 193 checks, 0 failed on the generated candidate in `.qa-dist`. The first run had 2 failures because the recipe did not report an editable `.blend` path; the recipe now saves the editable file under ignored `art-build/` and the rerun passed.
- Candidate GLB and editable `.blend` were recycled after budget verification because the card says the asset is not wired into the game. The lane tier's Blender output suite passed again with the candidate absent from `public/`.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 25 passed, 1 failed. `tools/test-review-evidence.mjs` failed on the evidence date mismatch (expects 4 November; path plan points to 5 November) and audio subtest `ffmpeg` spawn (`EPERM`). Its isolated rerun also failed 7/9 for the same reasons. No game code changed. Recorded for a future reliability card; this task did not change that suite or start another card.
- `npm.cmd run build`: passed (Vite 8.0.16, 636 modules). PowerShell blocked the `npm.ps1` shim, so the equivalent `.cmd` entry point was used. Vite printed existing dynamic-import and large-chunk warnings.
- Browser check: not applicable while the art is not wired into the game. Claude should judge the Blender sheet; no frame check applies to this art card.
- Replay fingerprints in lane tier: 297 checks passed across 33 cases, 31 events, 9 categories, three FPS values and three runs. No simulation or race code changed.
- Changed existing test assertions: none.

## Removed

- None.

## Claude review

- Judge `docs/board/looks/bowl-art-trucks/round-1.jpg`. The sheet is a Blender fit view, not an in-game result. The parent Titan keeps its stock paint; scores and limitations are in the review note.
