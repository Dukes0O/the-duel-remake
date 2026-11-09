# TOWN-ART-MACHINES-2 ? change note

## Changed

- Round 17 adjusted only the pipe truck: wheel faces use measured centers and radii from the side photo, the six tyres sit at ground level, and slab-like rails were replaced with round frame rails. Five named pipe joints stack pipes at rest; three pipes roll onto the ground in the work pose.
- Round 18 adjusts only the pipe truck. Its stake-side rails, headboard rack and tailgate are removed from the carve and traced from the side, front and rear photos. Photo textures keep their full source resolution. The comparison sheet keeps round 17's layout.
- Mixer and crane truck geometry is unchanged.

## Checks

- Blender 4.5.13 exported the family and rendered the six pipe-truck review views.
- `node tools/test-blender-output.mjs`: 389 checks passed, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed. Its one rerun failed the same way. Windows blocked the audio-analysis `ffmpeg` subprocess with `spawnSync ffmpeg EPERM`. Review JPG publication passed both runs.
- No lane tier, build, browser check or game look check was run. Claude should inspect the stake-rail and tailgate openings, headboard rack, photo match, and the rest and work poses.
- No assertions changed. Race fingerprints do not apply.

## Removed

- Removed the pipe truck's broad slab-like frame rails, replacing them with round frame rails.
- Removed the carved stake-side rails, headboard rack and tailgate, replacing them with traced photo slabs.
- Replaced the earlier work pose with four unloaded pipes by a pose with three pipes on the ground.
