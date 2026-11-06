# WW-ART-DAM rounds 6–9

## Changed

- Added a salt-streaked photo wall with four pipe mouths for the train-facing
  filling hall, wet silt for the buried gear and chute, and coursed stone for
  the isolated gatehouse.
- Reworked the gatehouse stone UVs and replaced scattered, small spillway cars
  with a staggered, denser field of reused crushed vans, buses and RVs.
- Added the round 9 GLB reimport review sheet and verdict.

## Checks and review

- Blender 4.5.13 LTS exported and reimported the model in an empty scene.
  Readback: 50,019 triangles and 3,111,772 bytes, under 60,000 triangles and
  3 MiB.
- Round 9 visual verdict: not passed; wider-view grounding and wreck contact
  need Claude's review. Scores and remaining differences are in
  `docs/board/looks/ww-art-dam/round-9-review.md`.
- No browser or game look check: this asset is not wired into the game.
- No race fingerprints or assertions changed; simulation code is untouched.

## Removed

- Removed the old salt-crust repeat and replaced it with a single mapped wall
  photograph.
- Removed the round 5 spillway placement pattern and its small wet-silt patches.

## Review status

Waiting for Claude's visual verdict before this candidate can pass.
