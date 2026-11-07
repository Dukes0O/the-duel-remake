# TOWN-ART-FOOD — greenhouse round 14

## Changes

- Generated a single orthographic side photo with OpenAI image generation, measured it on a grid, and saved it as the greenhouse's source side texture.
- Matched the side ridge and eaves to the front gable after each photo's measured span is converted to metres. Both ridges are about 4.04 m. Side/front eaves are about 2.00 m and 2.03 m (1.5% apart); the rear eave is within 2.6% of the side.
- Set model height to the ridge height and each gable photo's top to its ridge row. The rear source is centered at column 512, its mask retains the full outline, and the rear face now wears the rear photo with background bleed.
- Lowered the mask's grey chroma threshold to 8. The roof mask now retains a pale glass panel that was carved as a hole. Added rear-side fill to the matched Blender review lighting.
- The 1000×1554 review sheet is 174,765 bytes. It compares the side, front, rear and overhead photos at matching cameras, plus town-camera views.

## Checks

- Blender 4.5 export passed; food.glb is 2,481,944 bytes and the greenhouse bounds fit its plot.
- node tools/test-blender-output.mjs: passed, 377 checks, 0 failures.
- node tools/test-repo-hygiene.mjs: passed; size targets are advisory.
- node tools/test-review-evidence.mjs: 8/9 passed; audio analysis failed with spawnSync ffmpeg EPERM. Review JPG publication checks passed.
- No lane tier, build, browser check or race run. Claude should inspect the side/front/rear matches, the gable at town scale, rear-face brightness, the closed roof corner and photo bleed in the game.
- No assertions changed. No race fingerprints apply.

## Removed

- Removed the superseded round-13.jpg and round-13-review.md.
- Replaced the previous greenhouse side texture and round-13 food model.
