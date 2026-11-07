# TOWN-ART-OUTPOSTS — Round 3 change note

## Changed

- Kept the four-view `carve_object` recipe and changed the front and rear mappings to use the side photo's derived metre scale rather than separate end-view scales.
- Kept the two-sided DOT'S sign and removed the rear wing/side-wall silhouette through the existing measured rear-mask cuts.
- Exported and re-imported the family GLB; it is 933,368 bytes. The town family remains below the 8 MB limit. The model parts retain their named UV coordinate set and material metallic limit through the output check.
- Added the round 3 comparison sheet (132,427 bytes) and review. Removed the round 2 sheet as requested.

## Checks

- Blender export and empty-scene import/render: passed; five views generated. GLB 933,368 bytes.
- `node tools/test-blender-output.mjs`: passed, 308 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. Reported repository-wide size target overages are advisory and unrelated to this family.
- Browser/look check: not run here. Claude should inspect the matched views, front nose against its photo, the two sign faces, porch contact and tail projection.
- Race fingerprints: not applicable; no simulation code changed.
- Changed assertions: none.

## Removed

- Removed `docs/board/looks/town-art-outposts/round-2.jpg` per this round's instruction. No test or assertion was removed or weakened.
- Removed this round's temporary renders and test logs after review. Kept only the requested sheet, review, model, and task files.
