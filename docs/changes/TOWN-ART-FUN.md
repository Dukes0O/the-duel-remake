# TOWN-ART-FUN follow-up: statue round 16

## Design and change

The side, front and rear reference photos remain unchanged. The prior overhead image did not give a reliable standing plan view. The new `statue-above-r16.jpg` is a straight-down orthographic render from the exported standing statue, measured on a 100-pixel grid (plinth bounds x=452..799, y=431..750). It replaces the high-angle reference in the carve.

All four statue masks use a neutral-grey colour key sampled from the photo corners. This takes the enclosed grey between the legs and under the raised arm out of the silhouette. `largest_part` keeps the largest connected upper body before the lower plinth is restored. The separate blank plaque remains.

## Results

- Blender 4.5.13 recipe export and imported-GLB renders completed. The GLB is 3,990,164 bytes. The statue has 1,712 triangles (limit 1,800); both pieces pass footprint and contact checks.
- `node tools/test-blender-output.mjs`: passed, 377 checks.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. One failure expects the round-15 sheet, which this task explicitly removes. The other is the known `spawnSync ffmpeg EPERM` audio-analysis failure. No assertions changed.
- Browser checks: Claude should review the overhead pair and both three-quarter views. The front three-quarter render still reads as overlapping figures, so the requested one-figure look is not fully met. The overhead reference is an orthographic render, not a newly generated photo; the generated overhead attempts remained oblique or showed a lying figure.
- Lane tier and application build were not run, as directed for this art card. Changed assertions: none. Race fingerprints: not applicable.

## Removed

- Removed `round-15.jpg` and `round-15-review.md` as requested.
- Removed the round-15 plinth-only top-mask cuts; the measured round-16 top view now shapes the full carve.
