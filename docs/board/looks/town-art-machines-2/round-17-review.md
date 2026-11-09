# TOWN-ART-MACHINES-2 — round 17: pipe truck

## Result

Second photo-carve round for the pipe truck. The side photo grid set the three wheel centers to (139, 328), (583, 330), and (694, 330), with measured photo radii 62, 60, and 60 px. Their model radius is 0.70 m; all six tyres meet the ground. The slab-like rails are replaced with narrow round frame rails set inside the tyres.

The rest pose carries five separate pipes between the bed stakes. The work pose shows three separate pipes rolled onto the ground beside the truck. The four orthographic photo comparisons are large and side by side; rest and work use three-quarter views. The mixer and crane recipe sections were not changed.

## Checks

- Blender 4.5.13 exported the family GLB and rendered all six pipe-truck views.
- `node tools/test-blender-output.mjs`: 389 checks passed, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; size limits are advisory.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed. Its one rerun had the same `spawnSync ffmpeg EPERM` failure in audio analysis. The review JPG publication check passed both times.
- No lane tier, build, browser check or frame check was run. Claude should review the six panels, especially the side wheel clearance and grounding, the under-bed frame, the pipe stack, the three ground pipes, and the front/rear wheel appearance.
- No assertions changed. Race fingerprints do not apply.

## Removed

- Removed the broad slab-like frame rails and replaced them with narrow round rails.
- Removed the prior four-pipe work pose; three pipes now roll off onto the ground.
