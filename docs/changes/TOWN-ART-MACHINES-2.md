# TOWN-ART-MACHINES-2 - round 28

Adjusted only the loader in `tools/blender/town-machines-2.py`: tyre radius
and axle centres now use the current side photo's measurements; the bucket is
scaled to about 1 m tall, placed ahead of the front tyres and grounded; paired
arms run from frame pins beside the cab to the bucket pin. Kept the carve's
`underside` at 0.5 m. The other four passed machines' recipe sections were not
changed.

## Checks

- Blender export and loader render completed. Review views: side, front, rear,
  overhead, and work pose. Source photos on the sheet are shown whole.
- `node tools/test-blender-output.mjs`: passed, 389 checks and 0 failures.
- Browser/look check: Claude to review the loader sheet, especially tyre
  alignment, bucket clearance, visible arm connection, the dark ball artifact,
  and cab projection streaks. Chrome was not run.
- Changed assertions: none.
- Race fingerprints: not applicable to this art-only change.

## Removed

None.

---

## Round 29

Changed the loader only. Corrected the front arm hinge pin, relocated the
bucket hinge pin from the model origin to the bucket, placed the bucket ahead
of the front tyres, set the scoop to 2.6 m wide by 1.0 m tall with its bottom
on the ground, and changed the paired lift arms to worn ochre yellow. The
four passed machines were left unchanged. The emitted bounds confirm the
bucket spans x=-1.3..1.3 m and y=-0.005..0.995 m vertically; the bucket hinge
pin is centered at x=0, y=-2.5 m, z=0.98 m. The stray origin pin that appeared
as a floating dark ball is removed.

## Checks

- `node tools/test-blender-output.mjs`: passed, 389 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; placement clean and size targets advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed; the audio-analysis subtest failed twice because starting `ffmpeg` returned `EPERM` (`spawnSync ffmpeg EPERM`). The review JPG size and publication checks passed.
- Browser and in-game look checks: not run here; Claude should review the
  exported views and work pose in `docs/board/looks/town-art-machines-2/round-29.jpg`.
- Changed assertions: none.
- Race fingerprints: not applicable; art-only change.
- Lane tier and build: not run, as instructed for art rounds.

## Removed

- Removed the bucket hinge pin from the model origin; it is now parented at
  the actual bucket pivot.
