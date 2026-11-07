# TOWN-ART-PLANTS — follow-up

## Changed

- Added only `batch-plant` to the existing plants family. The accepted crusher
  remains its own child and its recipe stays in place.
- The cement silo is a photo-textured lathe with photo-traced legs. The two
  aggregate bins and mixing tower use `carve_object`; the tower has a `keep`
  cut for its drive-under bay. The discharge chute is a separate named piece.
- Added four generated reference JPGs and the round-7 comparison sheet. The
  family GLB is 2,379,956 bytes; the review sheet is 277,877 bytes.
- Updated the Blender-output assertion to keep the crusher and batch plant as
  separate children and check each building's triangle budget independently.
  No test tolerance or expected gameplay number was loosened.

## Checks

- Blender recipe and exported-GLB render: passed. The recipe printed bounds for
  each mesh and checked ground contact or contact with another piece, plus the
  4 by 4 footprint.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; the report listed existing
  advisory size targets, with no placement errors.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. The audio
  analysis subtest failed twice because `spawnSync ffmpeg` returned `EPERM`.
  Its sheet publication subtest passed.
- Lane tier and build: not run; this is an art card.
- Browser checks and in-game look: not run; Claude owns them. Claude should
  review the end-view match, chute visibility, and drive-under opening.
- Changed assertions: the plants-family child list now includes the new
  building; triangle counts are checked per building. No assertions were
  weakened.
- Race fingerprints: not applicable; no race code changed.

## Removed

- No accepted building or crusher part was removed. Temporary renders and
  source-generation scratch files were sent to the Recycle Bin after review;
  the four required JPG references remain.
