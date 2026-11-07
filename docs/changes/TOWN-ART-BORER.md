# TOWN-ART-BORER — round 6

Status: round 6 candidate committed for Claude's art review. Kind: art. The
machine is not wired into the game.

## Changes

- Rounded the carved tube with `round: 2.2` and constrained the cutter face
  photo to its forged rim. Restored the shadowed central hub region after the
  photo's background flood reached it through the cutter pockets.
- Removed the separate shaft boss and flange cylinders that obscured the photo
  hub. Raised the gripper shoes and contact pads onto the tube shell.
- Kept the tube and cutter placement. The gantry rails sit on Y=0, matching the
  tube feet; the front coupling plate overlaps the tube end.
- The duplicate dark post came from the four feet in the side photo being
  carved into the shell as well as modeled separately. The side mask now cuts
  those feet out, and the separate gripper shoes sit higher against the shell.
  The pale sheet at the cutter rim was traced studio background outside the
  forged rim; the radial mask clips it. Shaft cylinders that obscured the hub
  were removed so the photographed centre is visible.

## Evidence and checks

- Blender built and re-imported the GLB. Its internal placement checks passed:
  tube longest axis is Z, cutter pivot aligns to the tube front, and no mesh
  falls below Y=0. Export reports 30,146 triangles and 3,432,024 bytes.
- `node tools/test-blender-output.mjs`: passed, 317 checks.
- `node tools/test-repo-hygiene.mjs`: passed placement; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7 of 9 subtests passed, repeated once.
  The retained-size subtest expects the deleted `round-5.jpg` and fails with
  ENOENT. The audio subtest cannot start `ffmpeg` (`EPERM`). The round-6 JPG
  publication check passed both runs. No assertion was changed.
- Review sheet: `docs/board/looks/town-art-borer/round-6.jpg` (356,434 bytes).
- Claude should inspect the cutter's front silhouette and hub, the gripper shoes
  from the side, and the rail height and coupling contact. Browser and game-look
  checks do not apply because the asset is not wired into the game.
- No lane tier or build run, per the art-card instructions. No race fingerprint
  applies.

## Removed

- Replaced the round 5 GLB and review sheet with the round 6 versions; deleted
  `round-5.jpg` and `round-5-review.md` as requested.
- Removed the separate photo-obscuring shaft boss and flange meshes. No old
  runtime path or test behavior was removed.
