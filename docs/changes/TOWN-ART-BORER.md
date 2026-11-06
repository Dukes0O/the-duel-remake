# TOWN-ART-BORER

Status: one art round submitted for Claude's review; not a look pass.

## Design and work

Built the borer family recipe and GLB. The borer has a named rotating cutter pivot, shield, gripper shoes, service frame, cab, conveyor pivot, ladder and lamps. The family also contains tunnel-ring and portal nodes. It reuses `town_base` materials and exports with JPEG materials. The submitted view is imported from the GLB in a fresh Blender scene.

The borer is 15,032 triangles and the GLB is 1,214,056 bytes. The output stays within the card's 40,000 triangle and 4 MB family limits. The sheet scores the art 2/5 overall. The pale, smooth shield and weak assembly relationship do not match the photographic reference; the sheet lacks the reference crop. Claude should review the proportions, material and assembly before treating this art as accepted.

## Checks

- Blender recipe and exported-model render: completed. The Blender process exited cleanly on the final render; render and GLB evidence are in `.evidence/` until this commit.
- `node tools/test-blender-output.mjs`: passed, 276 checks.
- `node tools/test-repo-hygiene.mjs`: passed. Existing advisory size reports remain unrelated.
- `node tools/test-review-evidence.mjs`: 8/9 subtests passed; the JPG publication subtest passed. The audio analysis subtest failed twice because launching `ffmpeg` returned `EPERM`; no game code changed between runs.
- Browser/look checks: not run here. Claude should review `docs/board/looks/town-art-borer/round-1.jpg`, especially the shield material, cutter-to-shield proportions, cab and conveyor composition, and compare against the photographic target.
- No race fingerprint or assertion was changed.

## Removed

No existing model or recipe was replaced. Temporary renders and check logs were removed before commit.
