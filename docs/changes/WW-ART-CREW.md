# WW-ART-CREW round 4

## Changed

- Replaced Gerald's separate body and log legs with a closed overhead-photo
  relief grid. The source mask includes all four feet and the full tail; the
  nose-to-hip span is 0.30 m, the spine reaches 45 mm, and joint bumps lift the
  elbows and knees by 15 mm.
- Replaced the round 3 harpoon and piano recipe with outline lathe and measured
  slab recipes. Those two models are still pending in this staged change.
- Committed Gerald's current photo, model and first comparison row. The full
  three-row sheet will replace this first-row sheet after the remaining models.

## Checks

- Gerald Blender export, GLB reimport and matched renders: passed; 16,328
  triangles, 805,084 bytes. Render brightness: overhead 121.7 vs photo 130.0;
  side 120.4 vs photo 127.8.
- Visual self-check: overhead reads as a real lizard relief. The shallow side
  profile reads thin because the specified spine height is 45 mm; Claude should
  judge the paired side reference.
- `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`: pending the
  complete model.
- Browser checks: not run; Claude owns browser and look checks.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

- Removed Gerald's separate body/head/tail and straight leg geometry when the
  staged recipe replaces them. Round 3 sheet and note are replaced by round 4.
- No unrelated favours were added.
