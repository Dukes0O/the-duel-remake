# TOWN-ART-MACHINES-2

## Changed

Round 5 tightens the truck cab shells, changes truck bonnets to chamfered panels and lowers tyre tread relief to 5.5 cm. The round 5 sheet shows all seven machines at rest and work from the exported GLB imported into a clean Blender scene. The GLB is 2,878,416 bytes and each machine remains below 15,000 triangles. This round did not rebuild the mixer, crane, pipe truck or roller with `photo_model.py`, although that kit is present after the merge; the recipe still uses the earlier construction method. That part of the card acceptance remains open for Claude’s review.

## Checks

- Blender export and 14 imported-GLB renders: passed. Output: `.qa-dist/town-machines-2/blender.log` (temporary log removed after recording result).
- `node tools/test-blender-output.mjs`: passed, 295 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed.
- Browser and in-game visual checks: Claude to review; not run in this lane.
- Changed assertions: none.
- Race fingerprints: not applicable; art only.

## Claude review

Please inspect round 5 for cab closure and window frames, bonnet panel shape, tyre grounding and tread, roller drum metal, paver hopper, drill rig scale, crane outline, pipe stack and whole-machine framing. Compare the family to the round 4 photo crops. This round reuses the earlier crops and material pictures; it does not add newly generated dead-on reference photos.

## Removed

Removed the round 4 sheet and review note after replacing them with round 5. No model part or runtime texture was removed.
