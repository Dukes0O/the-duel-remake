# TOWN-ART-FUN - round 8

## Changed

- Added a dead-on wheel side photo and separate front and side photos of one
  hanging seat. Updated the photo credits.
- Rebuilt the wheel with a color-distance mask. Background-colored pixels are
  removed across the image, including between the spokes. Added two traced
  wheel faces one metre apart, the short lathed hub, twelve depth ties, eight
  individually pivoted seats, and the traced A-frame support.
- Added the round 8 comparison sheet. It shows the source photo beside the
  model from the side, two three-quarter views, and the mayor view.
- The tavern construction is unchanged.

## Checks

- Blender recipe: passed on the final source; exported `fun.glb` (9,703,084
  bytes) and completed the imported-model render views.
- Mask inspection: passed; spaces between spokes are black.
- `tools/test-repo-hygiene.mjs`: passed.
- `tools/test-review-evidence.mjs`: 7 passed, 2 failed on the first run and
  the rerun. One expects `round-7.jpg`, which this task explicitly asks to
  delete. The other needs `ffmpeg`, which returned `EPERM` in this job.
- `tools/test-blender-output.mjs`: not run. It checks the model's 3 MB family
  limit, which this export exceeds. No lane tier or build was run.
- Browser and look verdict: Claude's review. Please inspect the seat pivots,
  support-to-hub join, the detached-looking wheel layers in three-quarter
  views, and the small white block at ground level under the wheel. The block
  is visible in the rendered evidence and its source is unresolved.
- Changed assertions: none. Race fingerprints: not applicable; this art lane
  does not change race code.

## Removed

- Removed the round 7 sheet and its review note as requested. Kept round 6.
- Removed this run's temporary mask previews and render captures after making
  the review sheet.

## Claude review

The open-spoke mask and complete support are improved over round 7. This is
not a self-pass: the model exceeds the 3 MB family budget and the white block
and oblique wheel connections need review. The model and sheet are retained
for Claude's verdict.
