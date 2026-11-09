# TOWN-ART-MACHINES-2 ? round 18: pipe truck

## Result

Third pipe-truck photo round. The stake-side rails, headboard rack and tailgate are cut out of the four-view body carve and traced as photo-faced slabs. The side rails and rear gate keep gaps between their members. The headboard trace uses the front photo; the tailgate uses the rear photo. The source photos remain at their full 887 ? 443 resolution in the exported GLB. The mixer and crane truck geometry was left unchanged.

The exported pipe truck is 5,600 triangles. The full family is 6,121,828 bytes; the mixer is 13,724 triangles and crane truck is 5,600. The six-panel sheet keeps round 17's layout and is 358,671 bytes.

## Checks

- Blender 4.5.13 exported the family and rendered all six pipe-truck views from the imported GLB.
- `node tools/test-blender-output.mjs`: 389 checks passed, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed. Its one rerun had the same Windows `spawnSync ffmpeg EPERM` audio-analysis failure. The bounded review JPG publication check passed both runs.
- No lane tier, build, browser check or game look check was run. Claude should check the gaps in the stake rails and tailgate, confirm the headboard rack and rails match the photos, and inspect the rest and work poses.
- No assertions changed. Race fingerprints do not apply.

## Removed

- Removed the carved bed-side rails, headboard rack and tailgate from the pipe-truck photo masks and replaced them with traced photo slabs.
