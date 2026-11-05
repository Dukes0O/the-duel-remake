# CAR-ART-SCARAB

## Changed

- Added `tools/blender/scarab.py`, a reproducible Blender recipe for an original Scarab buggy candidate. It builds the open cage, rear engine, suspension links and springs, sand paddles, partial armor, whip flag, and standard vehicle-local forward/up axes. It exports the candidate GLB to `public/assets/models/wasteland/cars/scarab.glb` and renders five review views.
- Added one candidate entry to `tools/test-blender-output.mjs`, enforcing the 25,000-triangle cap and candidate status.
- Rendered round 1 and saved the compressed sheet and provisional scorecard under `docs/board/looks/car-art-scarab/`. Claude should review the silhouette, mechanical believability, wear, readability, scale figure, and provisional scores before deciding on the next art round.

## Checks

- Blender recipe: passed after correcting the empty-scene world setup and camera basis. 10,354 triangles; GLB 913,792 bytes; five renders produced.
- `node tools/test-blender-output.mjs`: passed, 233 checks, 0 failed. The first run found the repository's top-level generator discovery rule; the recipe was moved to `tools/blender/scarab.py` without changing any assertion.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): all 47/47 suites printed `PASS`, including replay fingerprints, socket checks and world-composition checks. The outer command did not return its final summary or exit code after the last suite; it remained open after all suite results were printed, so I stopped the wrapper. The `test-test-runner` suite itself also passed.
- `npm.cmd run build`: passed. PowerShell blocked the `npm` script shim before it started; `npm.cmd` ran the same build successfully. Vite reported existing dynamic-import and large-chunk warnings.
- Browser/game checks and frame timing: not applicable to this art-only candidate. Claude should judge the sheet; no browser session or game integration was run.
- Changed assertions: one new generator entry enables existing output-plan and candidate triangle/file-budget checks; no existing assertion was changed.
- Race fingerprints: passed unchanged in the lane suite, 297 checks across 33 cases, 31 events, 9 categories, three FPS values and three runs.

## Removed

Removed the generated Blend, candidate GLB, raw renders, manifest and scratch logs after review and checks. No prior asset or recipe was replaced.
