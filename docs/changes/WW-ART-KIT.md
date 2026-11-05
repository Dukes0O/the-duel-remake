# WW-ART-KIT

## Changed

- Added `tools/blender/scablands-kit.py` for basalt rocks, a roadside sign,
  radio mast, whole and burnt barricades, ember pot and job flag.
- Registered the recipe in `tools/test-blender-output.mjs`. The test reads the
  `.qa-dist` GLB, checks named parts and enforces the 30,000 triangle / 1.5 MB
  budgets. The model is not wired into the game, so it is not committed.
- Rendered one art round. The review sheet and builder scores are in
  `docs/board/looks/ww-art-kit/round-1.md`; its JPG is 57,619 bytes.
- Candidate GLB: 2,600 triangles, 264,832 bytes. No replay fingerprints
  changed. Added candidate budget and named-part assertions; no prior
  assertions were changed or weakened.

## Checks

- Blender 4.5.13 recipe build and three review renders: passed.
- `node tools/test-blender-output.mjs`: 193 checks passed on rerun after fixing
  the recipe's `.blend` path plan.
- Lane tier: all 48 suite results were emitted (46 passed, 2 failed). The
  outer runner did not exit after the last result and was stopped. The two
  failures were unrelated FFmpeg `EPERM` errors in Eifel loudness measurement
  and review-evidence audio analysis; each suite was rerun once and failed the
  same way. `tools/test-repo-hygiene.mjs` passed in the lane tier.
- `npm.cmd run build`: passed. Vite reported the existing dynamic import and
  large-chunk warnings.
- Browser and in-game look checks: Claude runs. Please inspect the round-one
  sheet and source renders listed in the look note. This card does not wire the
  model into the game.

## Removed

- Nothing replaced or removed.
