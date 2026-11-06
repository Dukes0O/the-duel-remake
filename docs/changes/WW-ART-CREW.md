# WW-ART-CREW round 4

## Changed

- Replaced Gerald's separate body and log legs with a closed overhead-photo
  relief grid. The source mask includes all four feet and the full tail; the
  nose-to-hip span is 0.30 m, the spine reaches 45 mm, and joint bumps lift the
  elbows and knees by 15 mm.
- Replaced the round 3 harpoon with a 120-column, 12-sided outline lathe from a
  new level side-on photograph. The piano's measured slab model is still
  pending in this staged change.
- The current committed sheet contains the Gerald views and harpoon side view.

## Checks

- Gerald Blender export, GLB reimport and matched renders: passed; 16,328
  triangles, 805,084 bytes. Render brightness: overhead 121.7 vs photo 130.0;
  side 120.4 vs photo 127.8.
- Harpoon Blender export, GLB reimport and matched render: passed; combined
  model has 19,206 triangles and is 1,118,632 bytes. Brightness: 87.3 vs
  photo 80.5. A pale silhouette rim remains for Claude's review.
- Visual self-check: Gerald's overhead reads as a real lizard relief. Its
  shallow side profile reads thin because the specified spine height is 45 mm.
  The harpoon silhouette matches its reference, with a light rim to review.
- `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`: pending the
  complete model.
- Browser checks: not run; Claude owns browser and look checks.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

- Removed Gerald's separate body/head/tail and straight leg geometry. Round 3
  sheet and note are replaced by round 4.
- No unrelated favours were added.
