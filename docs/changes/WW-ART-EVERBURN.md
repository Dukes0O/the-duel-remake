# WW-ART-EVERBURN

- **Status:** Round 1 built; awaiting Claude's look judgment.
- **Kind:** Art.
- **Switch:** None. This asset is not wired into the game in this card.
- **Settled design:** One standalone, metre-scaled well prop with named shared, cap, valve-wheel and flame parts; Blender scene up is rotated into the GLB's +Y up convention. No open card question needed a decision.
- **Changed:** Added `tools/blender/scablands-everburn.py`, exported `public/assets/models/wasteland/scablands/everburn.glb` (10,338 triangles; 783,444 bytes), registered and budget-checked it in `tools/test-blender-output.mjs`, and rendered three views for the round sheet.
- **Round sheet:** `docs/board/looks/ww-art-everburn/round-1.jpg` (38,897 bytes, under 500 KB). Scores and five main gaps are in the adjacent round note. Claude should judge the grit, readability of cap/burning states, and next changes.
- **Reuse and credits:** No compatible Scablands well donor exists. No art-library files were used. The arsenal has procedural fire effects but no reusable flame image texture under `src/arsenal`; the model uses its orange/gold color direction. This is recorded as a round gap.
- **Card check:** `node tools/test-blender-output.mjs` — 193 checks passed, 0 failed.
- **Lane tier:** `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` — 46 passed, 2 failed, 0 not run. The one allowed rerun of each failed suite reproduced both failures: `tools/test-circuit-eifel.mjs` fails its FFmpeg loudness measurement; `tools/test-review-evidence.mjs` gets `spawnSync ffmpeg EPERM` in its audio analysis test. These suites are unrelated to the changed files; no game code changed. The asset's JPG publication check passed within `test-review-evidence`.
- **Build:** `npm.cmd run build` — passed (3.10 s). PowerShell blocked the `npm.ps1` shim under its execution policy, so I ran the equivalent `npm.cmd run build` from PowerShell. Vite reported existing dynamic-import and large-chunk warnings.
- **Browser / look:** No browser check; the asset is not wired into the game. Claude runs the look check on the round sheet.
- **Changed assertions:** None. Added positive budget and named-part assertions for this new asset.
- **Race fingerprints:** Not applicable; no simulation or course files changed.

## Removed

No prior model, recipe, test or document was replaced.
