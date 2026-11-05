# WW-ART-MALL

Changed the Blender recipe to add a recognizable open-front mall shell, broken roof plates, shop recesses and shutters, rust runoff, welded supports, an entry scale figure and lower eye-level review cameras. Round 2 replaces the prior published sheet with a single JPG comparison of both rounds. The candidate GLB is generated for review; it is not wired into the game here.

**Art checks:** Blender rendered four views. The GLB readback is 13,940 triangles and 740,216 bytes, within 50,000 triangles and 2 MB. The JPG is 85,131 bytes. `node tools/test-blender-output.mjs` passed (192 checks).

**Lane tier:** all 48 listed suites completed and replay fingerprints passed (297 checks). The runner did not return its summary after those results and was interrupted. Its log showed two suite failures: `test-circuit-eifel.mjs` failed its FFmpeg loudness measurement; `test-review-evidence.mjs` saw the old sheet absent while the deletion was unstaged and also hit `spawnSync ffmpeg EPERM`. The one rerun of each suite did not pass: Eifel repeated the FFmpeg measurement failure; review-evidence no longer failed the old-sheet assertion after staging was attempted, but FFmpeg still returned EPERM (staging itself was denied by filesystem permissions).

**Build:** `npm.cmd run build` passed. Plain `npm run build` could not start because PowerShell blocked `npm.ps1`; using the Windows npm command succeeded. Build warnings were the existing dynamic import and large-chunk warnings.

**Browser and look review:** Claude runs the browser checks if needed and judges `docs/board/looks/ww-art-mall/round-2.jpg`; four Blender source renders are in `.evidence/2026-11-05/WW-ART-MALL/round-2/`. No frame check applies to art.

**Changed assertions:** none. **Race fingerprints:** unchanged; replay guard passed in the lane run. No game simulation code changed.

## Removed

Removed the round 1 sheet and note after replacing them with the round 2 comparison and review note. No runtime model or game asset was replaced.
