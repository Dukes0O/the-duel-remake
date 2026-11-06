# TOWN-ART-HOMES: round 6

## Changed

- Rebuilt the tent frames as pitched ridge-pole tents with guy ropes, weighted hems, a tied-open flap and a dark interior. Added a credited, repeating cream-and-tan canvas picture.
- Added thick decks and crossed steel support braces under the upper block containers. Stairs now have stringers, handrails and a landing at the upper door. The stack frames keep crossed bracing and thicker floors.
- Replaced large roof stripes with 100 mm metal folds running from ridge to eave. Corrugated wall detail now comes from the true-scale material pictures to keep each 1x1 home inside its triangle budget. Roofs overhang and use different pitches and repairs.
- Changed doors, windows and rooftop clutter across the homes. Kept braced black tanks on block-a and terrace-a, dishes and aerials on selected homes, tyres on tin roofs, and a short clothesline at the edge of stack-b.
- Lowered and evened the review light over a mid-grey-brown ground. The recipe imports the exported GLB into a new empty Blender scene for every view.
- Embedded 15 separate JPEG material pictures, each at or below 256 px, instead of one atlas. The exported family is 1,780,924 bytes and 19,004 triangles.
- Added and credited `canvas-patched-cream.jpg`. The round 6 sheet is 497,720 bytes.

## Self-review and Claude's look

The structural changes and material color are clearer, but the family still looks too regular beside the target photo. The tent cloth reads as broad, fairly taut panels; its folds and loose flap are too subtle. Several homes still have clean box proportions and small, repeated roof repairs. The wall corrugation is in the pictures rather than the wall geometry to meet the 1x1 budget.

An approximate blue-surface sample from the target and the exported render was within 15% in RGB, but it was not a strict same-panel comparison: the photo shows a blue wall and the model view shows a blue roof. Do not treat the 15% color target as proven.

Round 6 is the third submitted sheet, the card's final art round. Claude's look verdict is still needed. The independent art review says the houses read as distinct tiers and the structural changes are clear, but the tents still look taut, the homes remain boxy, and the painted surfaces look cleaner than the reference. The review sheet does not show the model in the game.

## Checks

- Blender 4.5: built and exported the family; imported the GLB into an empty scene and rendered all ten homes and both street views. Passed its plot-clearance, node and family-budget assertions.
- `node tools/test-blender-output.mjs`: passed, 250 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement clean. Size targets were advisory.
- `node tools/test-review-evidence.mjs`: after restoring the round 3 and 4 review pairs, 7 checks passed and 2 failed. The remaining failures are a date mismatch in the unrelated crew evidence path test and the known `ffmpeg` permission error.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: stopped after 12 passed and one failed suite; 34 suites did not run. The failure was `tools/test-circuit-eifel.mjs` at its FFmpeg loudness check. The one same-commit rerun had 17 passes and the same FFmpeg loudness failure.
- `npm.cmd run build`: passed. PowerShell blocked the `npm` script wrapper; the Windows `npm.cmd` entry point completed the build.
- No race fingerprints apply. No simulation code changed.
- Changed assertion: the homes test now checks separate repeating JPEGs, a 256 px limit on each image, total image area no larger than 1,024 × 1,024 pixels, unique image use and metallic factors at or below 0.3. This keeps the one-1K texture budget and allows separate pictures. Claude must review this stricter assertion change on the card.
- Code review found the new texture pictures and their credits are outside the card's owned-file list. The Director must add those paths to the card scope before this lane can merge.

## Removed

- Replaced the atlas-based material setup and round 5 scratch image paths with the credited repeating JPEGs.
- Kept the passing round 3 sheet and the round 4 review pair because the review-evidence test requires tracked sheets to have their paired notes and files.
- No game feature or existing runtime family was removed.
