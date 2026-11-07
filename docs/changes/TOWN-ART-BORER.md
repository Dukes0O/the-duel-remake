# TOWN-ART-BORER — round 5

Status: candidate ready for art review. Kind: art. Flag: none; the machine is
not wired into the game.

## Settled design

- Carve the 30 m shield tube from clean, matching side, front, rear and overhead
  photos. Keep the cutter face on its rotating `borer:head` pivot.
- Join the rear gantry to the tube with an overlapping coupling plate and side
  girders. Keep `borer:belt` and `borer:lamp` as separate named assemblies.
- Use the card's 40,000 triangle and 4 MB family limits. No frame timing applies
  to this art round.

## Evidence and checks

- Blender built and re-imported the GLB. It reports 31,014 triangles and
  3,489,492 bytes. The export script's ground and cutter-pivot checks passed.
- The comparison sheet is `docs/board/looks/town-art-borer/round-5.jpg`
  (137,371 bytes); its scores and visual verdict are beside it.
- `node tools/test-blender-output.mjs`: passed, 317 checks.
- `node tools/test-repo-hygiene.mjs`: passed placement checks; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7/9 passed; the same two unrelated failures reproduced on rerun. The existing town-art-power round-4 JPG lacks its matching note, and audio analysis cannot launch `ffmpeg` (`EPERM`). The round-5 JPG publication check passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 13 suites passed, 1 failed, 33 not run. The run stopped on its first failure; its failing suite name was not captured in the returned log.
- `npm.cmd run build`: passed (746 modules). Existing large-chunk and mixed dynamic/static import warnings remain.
- `node tools/build-status.mjs`: wrote the session status snapshot; full tier remains stale for this candidate.
- No test assertions or replay fingerprints changed. No browser or game look
  check applies to this un-wired art asset.

## Removed

- Replaced the round-4 borer GLB with the round-5 export. The prior binary is
  retained only in Git history.
- No old recipe, runtime path, or test behavior was removed.
