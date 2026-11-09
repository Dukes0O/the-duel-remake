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
