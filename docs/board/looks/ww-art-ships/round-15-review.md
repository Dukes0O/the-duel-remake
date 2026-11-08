# WW-ART-SHIPS round 15 review

Date: 7 November 2026  
Build: Blender 4.5.13 LTS; six views rendered from the exported GLB imported into an empty scene  
Sheet: `round-15.jpg` (1600 x 1800, 92,216 bytes)

## Triangle counts

- Good Hope: 5,576 triangles.
- Marigold: 5,650 triangles.
- Patience: 10,755 triangles.
- Whole-file read-back: 35,019 triangles; 2,587,396 bytes. All ship and file budgets pass.

## Scores

- Reference resemblance: 3/5.
- Readability: 3/5.
- Grounding: 3/5.
- Fleet consistency: 3/5.
- Frame cost: not measured; the ships are not wired into the game.

The family view and both close ship views fill more than half their frames, with the horizon in the lower third. Two low, rounded mounds meet the ground at each hull; the broad flat sand ledges are gone. The Good Hope and Marigold cabin ends carry side-plating texture, and their roof edges no longer show blank white faces. Some texture stretching remains on the small end faces. Claude should judge that close-up texture, the Marigold cabin color, and the remaining thin sand mounds at the hull line.

`tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. `tools/test-review-evidence.mjs`: 8 passed, 1 failed because sandbox `ffmpeg` returned `EPERM`; Claude should rerun it. No browser check, lane tier, build or frame check was run for this art-only task. Changed assertions: none. Race fingerprints: none.
