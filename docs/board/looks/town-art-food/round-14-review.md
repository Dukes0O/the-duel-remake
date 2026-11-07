# TOWN-ART-FOOD greenhouse round 14

## What changed

- Replaced the side reference with one generated orthographic photo of the same salvaged greenhouse. It is saved at `public/assets/models/wasteland/town/textures/greenhouse-side.jpg`.
- Measured the resized side photo on its grid: x=150–956, ground row 560, ridge row 76 and eaves row 320. The ridge is 484 px above ground and the eaves are 240 px above ground.
- The front photo measures ground row 640, ridge row 24 and eaves near row 330. Calibrating each view to its measured span gives 4.04 m at both ridges. Side/front eaves are about 2.00 m / 2.03 m, a 1.5% difference; the rear eave is within 2.6% of the side.
- Set `height` to the ridge height. Set the front and rear `top` values to their measured ridge rows, 24 and 31. The rear photo is centered at column 512; its saved mask retains the complete gable. The carve now assigns the actual front and rear photos to their corresponding faces and bleeds photo background out.
- Lowered the grey chroma threshold to 8. The top-view mask now includes the pale glass patch that caused the small roof hole. A soft rear-side studio fill makes the rear comparison readable under the matched review lighting.

## Review sheet

`round-14.jpg` is 1000×1554 and 174,765 bytes. It compares the side, front gable, rear gable and roof plan photos beside the carve, plus the three-quarter and mayor views. The gable is visible at both ends and the roof has no corner hole.

Codex review: silhouette/proportions 4/5, material resemblance 3/5, grounding 4/5, town-scale readability 3/5. Frame cost is not measured; this model is not wired into the game.

## Claude should inspect

- Whether the side, front and rear gables read as the same pitched greenhouse from the road and mayor cameras.
- Rear brightness and photo/background bleed in the game lighting.
- Glass and plant readability at town scale; the packed photo textures are deliberately small.

Largest remaining differences: the carve softens the source's thin frame edges; photo detail is blurrier at this texture size; the glass reads more opaque than the photos; plant rows lose small leaf detail; the gable ribs and roof patches are less individually raised than in the photos.

## Checks

- Blender 4.5 export passed. `food.glb` is 2,481,944 bytes. Greenhouse body bounds fit its plot.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8/9 tests passed. Audio analysis failed with `spawnSync ffmpeg EPERM`; the review JPG publication checks passed.
- No lane tier or build. No browser check; Claude should inspect the side/front/rear photo matches, the gable at the town camera, rear-face brightness, roof-hole closure, and the texture/background bleed in the game. No race fingerprints apply. No assertions changed.

## Removed

- Removed the superseded `round-13.jpg` and `round-13-review.md` after completing this round.
- Replaced the previous greenhouse side photo and the round-13 carved model.
