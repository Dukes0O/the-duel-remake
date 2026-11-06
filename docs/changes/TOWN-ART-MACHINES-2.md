# TOWN-ART-MACHINES-2 · Round 3 candidate

## Settled design for rounds 3–6

- Keep the same full-scale articulated wheel-loader reference and camera. Remove the photo crop from the cab: it reads like a sticker rather than paint.
- Rebuild the bucket as a deep, curved steel scoop with real side cheeks, a formed back, wear plates and separated teeth. Reduce the oversized arm rails, make their hydraulic links read as one connected mechanism, and give the cab a thinner frame and a clear door seam.
- Kyle's 5 November inbox note permits up to six rounds per art card, replacing the older three-round cap. Two rounds were submitted before this change. Keep round 3 as a candidate until it passes self-review; use rounds 4–6 only to close gaps that remain.
- Show all seven machines in the same low three-quarter view at rest and at work. Keep working parts in named pivots, and keep the family roots separate in the exported row.

## Round 2

## Changed

- Rebuilt the loader around separate front and rear frame nodes, four continuous
  dark chevron tyres, two boxed lift arms, two visible hydraulic rams, a Z-bar,
  a curved bucket shell, a thick cutting edge and teeth. `loader:arms` and
  `loader:bucket` pivot at their hinges and show distinct rest and scoop poses
  in renders from the exported and reimported GLB.
- Reused the machines-1 picture materials and dark tyre treatment. Added a
  small crop of the round-2 reference on the cab door and recorded its origin in
  the town texture credits.
- Preserved the seven required roots and moving-node names. The family GLB is
  1,966,836 bytes. Read-back triangle counts: loader 11,096; mixer truck 5,942;
  roller 4,636; paver 4,612; drill rig 5,554; crane truck 4,678; pipe truck
  3,870. A direct read-back check found 198 primitives with only `TEXCOORD_0`
  and a nonzero UV range; maximum `metallicFactor` was 0.29.
- Added the round-2 comparison sheet and self-review. The loader still fails the
  visual comparison. The mixer, roller and drill rig have not had a look round.

## Checks

- `node tools/test-blender-output.mjs`: passed, 262 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Its size report lists pre-existing
  advisory targets; this change added no oversized runtime file or look sheet.
- Direct GLB read-back: all named machine roots and stated family budgets are
  within limits; UV and metallic checks passed.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed on both runs.
  The audio-analysis subtest failed twice because starting `ffmpeg` returned
  `EPERM`. No test assertion changed.
- No browser or in-game check was run in this lane. No race fingerprints apply
  to this art-only change.

## Claude should review

- The loader's proportions, boxed arm attachment, cab posts and door crop
  against the reference; the builder verdict is fail.
- Rest and scoop pivots, particularly whether the bucket appears connected to
  the Z-bar and rams in both poses.
- The mixer truck, roller, paver, drill rig, crane truck and pipe truck in a
  later look round; this round's sheet shows only the loader.

## Changed assertions

None.

## Race fingerprints

Not applicable; no simulation code changed.

## Removed

- Deleted `round-1.jpg` and `round-1-review.md` after replacing their review
  evidence with the round-2 sheet and note.
- Replaced the round-1 torus tyres with a continuous chevron carcass.
