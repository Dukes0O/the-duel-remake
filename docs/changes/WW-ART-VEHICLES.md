# WW-ART-VEHICLES

## Changed

- Added the Blender recipe `tools/blender/scablands-vehicles.py` for Big Bess, Old Smoke's rolling furnace and the thief buggy. It exports three named roots, with three independently named furnace vents, mouth parts and glow parts.
- Registered the recipe in `tools/test-blender-output.mjs`. Generated the combined candidate model for budget and node readback, then removed it: the card says the vehicles are not wired into the game yet, and only game-loaded models belong in this commit.
- Built one Blender review sheet at `docs/board/looks/ww-art-vehicles/round-1.jpg` (66,559 bytes) and recorded provisional scores and gaps in the round note. No family reference image or game capture was provided; Claude should judge the candidate and select round 2's focus.
- Readback: 412,536-byte GLB, 6,228 triangles total across the three vehicles, under 12,000 each by the mesh count. Each vehicle is below the 1.5 MB total file budget. No external art-library files were used.

## Checks

- Blender recipe and render: passed with Blender 4.5.13 LTS.
- `tools/test-blender-output.mjs`: passed, 192 checks; its lane-tier run also passed.
- `tools/test-repo-hygiene.mjs`: passed; placement clean. The size report includes existing oversized assets; the new GLB and sheet are within this card's budgets.
- Lane tier: completed its 47 selected suites, with one failure: `tools/test-circuit-eifel.mjs` failed at FFmpeg loudness measurement (`FFmpeg loudness measurement failed`). The one allowed same-commit rerun reproduced the failure (17 pass, 1 fail in that suite). The other completed suite outputs passed, including replay fingerprints (297 checks). The lane-runner process stayed open after its final suite and was stopped after its outputs were read.
- `npm.cmd run build`: passed. PowerShell blocked the `npm` script shim under its execution policy, so the equivalent `npm.cmd` was used. Vite emitted existing dynamic-import and chunk-size warnings.
- Browser checks and look verdict: Claude runs/reviews. No browser check or frame check was run; the models are not wired into the game.
- Changed assertions: none.
- Race fingerprints: not applicable; no race code or simulation changed.

## Removed

- None. This is the first recipe and candidate asset for the card.
