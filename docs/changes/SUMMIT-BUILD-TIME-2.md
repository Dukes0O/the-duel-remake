---
task: SUMMIT-BUILD-TIME-2
status: building
player_facing: no
---

# SUMMIT-BUILD-TIME-2

## Design

Keep every drawn value, triangle and scene signature exact. The Node profile
puts far terrain at about 283 ms and near terrain at 191 ms in a 1,043 ms
snow-enabled world build. Use sized Float32 buffers for the rectangular far
mesh instead of growing JavaScript arrays and copying them afterwards. Reuse
near-ribbon edge points when closing the continuous ground. No finish kit,
art, collision, race, save or snow-rule changes. Existing summit-run switch.

Checks: unchanged world-composition signatures and exact ground-row checks;
Summit ground-gap regression; lane tier (jobs 4), production build and one
independent review. Compare Node build timers with real approved kits and
snow, using a canvas/texture stub and no graphics or storage. These are local
comparisons only; Claude owns official High/Performance timing. No frame run.

## Evidence

Pending.

Changed assertions: none. Replay fingerprints and world fixtures must stay exact.
Pictures: no new pictures required for identical drawn output.

## Removed

Replace temporary grow-and-copy far-mesh arrays in the same change. Recycle
owned timer scratch and build output after recording the result.
