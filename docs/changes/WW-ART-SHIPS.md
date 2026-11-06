# WW-ART-SHIPS

Status: incomplete. The final model and review sheet were not produced.

## Changes

- Added the Blender recipe for the three ships, lighthouse, and pilot boat.
- Added three photo projection crops and their prompts and credits.
- Added the ship GLB budget entry to `tools/test-blender-output.mjs`.

## Checks and review

- `tools/test-repo-hygiene.mjs`: passed on the final source tree after removing the unreviewed candidate.
- `tools/test-blender-output.mjs`: the preflight failed because `ships.glb` did not yet exist. An intermediate export later measured 34,200 triangles and 2,906,568 bytes, within budget, but it was visually rejected and was not rebuilt from the latest recipe.
- `tools/test-review-evidence.mjs`: not run; there is no submitted sheet.
- Browser review: not run; Claude handles browser and look checks.
- Changed assertions: none.
- Race fingerprints: none; this is an art-only card.

## Block

The card requires a Blender render and review sheet. Before each Blender run,
committed-memory headroom must be at least 8 GB. After more than 30 minutes of
waiting, it still ranged from about 6 to 7.6 GB. The latest geometry and camera
changes therefore have no exported-model render or budget measurement.

## Removed

- Removed the visually rejected intermediate `ships.glb`; it did not match the
  latest recipe and was not submitted as a placeholder.
