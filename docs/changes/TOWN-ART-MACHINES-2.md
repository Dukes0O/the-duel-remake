# TOWN-ART-MACHINES-2 — change note

## Changed

- Round 17 adjusts only the pipe truck: wheel faces use measured centers and radii from the side photo, the six tyres sit at ground level, and the slab-like rails are replaced with narrow round frame rails inside the wheels.
- Kept five named pipe joints stacked on the bed at rest; the work pose moves three separate pipes onto the ground.
- Replaced the comparison sheet with large side-by-side orthographic photo/model panels and three-quarter rest/work views.
- Mixer and crane recipe sections were not changed.

## Checks

- Blender 4.5.13 export and six imported-GLB renders completed.
- `node tools/test-blender-output.mjs`: 389 checks passed, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed; one rerun failed the same way. Windows blocked the audio-analysis `ffmpeg` subprocess with `spawnSync ffmpeg EPERM`. Review JPG publication passed both runs.
- No lane tier, build, browser check or look test was run. Claude should inspect side wheel clearance and grounding, the frame beneath the bed, the five-pipe rest stack, all three dropped pipes, and front/rear wheel appearance.
- No assertions changed. Race fingerprints do not apply.

## Removed

- Removed the pipe truck's broad slab-like frame rails and replaced them with narrow round rails.
- Replaced the earlier work pose with four unloaded pipes by a pose with three pipes on the ground.
