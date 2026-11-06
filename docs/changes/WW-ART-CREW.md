# WW-ART-CREW round 4

## Changed

- Replaced Gerald's separate body and log legs with a closed overhead-photo
  relief grid. The source mask includes all four feet and the full tail; the
  nose-to-hip span is 0.30 m, the spine reaches 45 mm, and joint bumps lift the
  elbows and knees by 15 mm.
- Replaced the round 3 harpoon with a 120-column, 12-sided outline lathe from a
  new level side-on photograph.
- Rebuilt the piano from measured, unrounded slabs at the specified depths.
  Its front faces use their own picture regions; wood returns use two-dimensional
  photo crops, and the opening sides use darkened wood.
- Completed the three-row comparison sheet from matched renders of the
  exported and reimported GLB.

## Checks

- Blender 4.5 recipe rebuild, GLB reimport and matched renders: passed;
  19,386 triangles, 1,676,328 bytes across all three props.
- `node tools/test-blender-output.mjs`: passed, 258 checks.
- `node tools/test-repo-hygiene.mjs`: passed; size advisories only.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: failed in the
  unrelated Eifel audio loudness check. Its same-commit rerun also failed.
  FFmpeg is unavailable in this session, so that check could not measure the
  audio. No test assertions changed.
- `npm run build`: passed.
- Browser checks: not run; no browser check is named on this card.
- Claude's final look verdict: pending. The harpoon's light silhouette rim and
  Gerald's shallow side profile remain called out for review.
- Visual self-check: Gerald's overhead reads as a real lizard relief. Its
  shallow side profile reads thin because the specified spine height is 45 mm.
  The harpoon silhouette matches its reference, with a light rim to review. The
  piano's front reads as an old upright with exposed action and no white edges.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

- Removed Gerald's separate body/head/tail and straight leg geometry and the
  round 3 piano/harpoon shapes. Round 3 sheet and note are replaced by round 4.
- No unrelated favours were added.
