# Round 14 review: formwork

The source photos and exported `formwork-1` model are shown at matching side, front, rear and overhead orthographic views. The overhead image retains the wet/set split and embedded steel. The three-quarter and mayor views show all four footprints.

The first internal render used flat concrete colours and let the concrete extend beyond the form's opening. Round 14 now uses the top photo as the concrete texture, with a lower roughness for the wet slab and a higher roughness for the set slab. The opening is fitted to the timber's inside faces. The timber stays visibly weathered, braced and low; the thin steel stakes remain visible. The forms read clearly from above and the driver's view. This is the first submitted formwork sheet; Claude's art verdict is pending.

`formwork-1` through `formwork-4` use 6.8 x 6.8 m, 6.8 x 14.8 m, 14.8 x 6.8 m and 14.8 x 14.8 m footprints. Blender printed bounds and contact checks for every part. The family GLB is 3,448,256 bytes; it is under the specific 8 MB family limit used by the output test, while above the card's general 3 MB statement. This inherited family was already 3,196,888 bytes before formwork. The discrepancy is recorded for Claude to settle before adding more buildings.

`node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures. `node tools/test-repo-hygiene.mjs`: passed; sizes are advisory. `node tools/test-review-evidence.mjs`: 8 of 9 passed on both runs; audio analysis could not start `ffmpeg` (`spawnSync ffmpeg EPERM`). The instructed card checks passed except for that tool error.

Per the task brief, the lane tier and build were not required for this art card. The lane tier was run by mistake against the broader AGENTS gate and stopped after 13 suites passed and 1 failed. That failure was in the same audio-analysis/ffmpeg check; 33 suites were not run. No build was run. No browser, in-game or frame check was run; Claude owns the art review.

No game rules changed; race fingerprints are not applicable. No assertions were loosened. The added GLB assertions require four named formwork roots, their wet/set and timber/stake parts, and the footprint-based triangle caps.

## Removed

No accepted buildings or prior review sheets were removed. Temporary renders and logs from this run are deleted after the final sheet is committed.
