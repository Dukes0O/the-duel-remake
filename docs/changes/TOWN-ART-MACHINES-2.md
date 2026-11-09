# TOWN-ART-MACHINES-2 ? change note

## Changed

- Round 17 adjusted only the pipe truck: wheel faces use measured centers and radii from the side photo, the six tyres sit at ground level, and slab-like rails were replaced with round frame rails. Five named pipe joints stack pipes at rest; three pipes roll onto the ground in the work pose.
- Round 18 adjusts only the pipe truck. Its stake-side rails, headboard rack and tailgate are removed from the carve and traced from the side, front and rear photos. Photo textures keep their full source resolution. The comparison sheet keeps round 17's layout.
- Round 19 adjusts only the pipe truck. The folded loading crane is restored as a separate photo-traced piece. The bed has spaced posts and three thin box-beam rails per side, plus box-beam headboard and tailgate assemblies, using cropped worn-yellow photo texture. The bed walls are excluded from the body carve. Round 18's wheel and pipe geometry, poses and sheet layout remain in place.
- Mixer and crane truck geometry is unchanged.
- Family GLB: 5,933,520 bytes. Round 19 sheet: 283,901 bytes.

## Checks

- Blender 4.5.13 exported the family and rendered the six pipe-truck review views.
- `node tools/test-blender-output.mjs`: 389 checks passed, 0 failed on the final GLB.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed. Its one rerun failed the same way. Windows blocked the audio-analysis `ffmpeg` subprocess with `spawnSync ffmpeg EPERM`. Review JPG publication passed both runs.
- No lane tier or build was run. Claude should inspect the separate crane silhouette and its fit behind the cab, confirm the bed rails/headboard/tailgate have the intended worn-yellow photo wear and open gaps, and check the rest and work poses against the photos.
- No assertions changed. Race fingerprints do not apply.

## Removed

- Removed the pipe truck's broad slab-like frame rails, replacing them with round frame rails.
- Removed the carved stake-side rails, headboard rack and tailgate, replacing them with traced photo slabs.
- Removed the round 18 traced bed-wall recipe and replaced it with separate thin box-beam members. Removed the loading crane from the body carve and added it as its own named piece.
- Replaced the earlier work pose with four unloaded pipes by a pose with three pipes on the ground.
