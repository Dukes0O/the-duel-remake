# CONVOY-FRAMES: moving tanker cost

Matched moving-frame scenario is prepared. Valid measurements are still pending.

## Changed

- Existing private harness and 120-frame profiler compare High and Performance
  at 1280 by 720, near and distant, in two counterbalanced seeded pairs.
- Real native Convoy entry, one repeated coasting pose and ordinary chase camera
  keep simulation and presentation moving. Fixed-tick witnesses compare paths.
- Baseline detaches only the loaded tanker around composer draws, restoring its
  exact parent, child index and visibility in finally. Asset loading, native
  movement, pose and valve updates stay common. It does not change the game.
- Delivered frame p95, CPU submission and completed GPU pass costs stay separate.
  GPU pass p95 sums are a cost proxy, not a whole-frame percentile. Unavailable
  GPU timing is reported; paired delivered/CPU costs remain. Inconsistent costs
  do not pass. Repeated overhead above ten percent
  requests the distant-view hook before any optimization.

## Checks

Source review found that missing CPU timing could evade a comparison. The sample
now requires the record, sufficient frames and finite positive CPU cost.
Browser setup stopped before samples: yard presentation, then stopped asset
readiness. Both now use the existing Convoy onFrame plus renderFrame recipe;
the yard also waits for its real control. No paired guard or cost threshold changed.
The harness's isolated build passed; no frame-cost verdict or runtime change.
The latest ready check still timed out with no samples, warnings or errors.
The last attempt proved native Convoy/Salt Flats/countdown entry and loaded tanker
readiness, then timed out before the first 120-frame profiler result. It recorded
no cancellation reason. No valid samples or cost/release pass; runtime is unchanged.
The fixture now waits the existing Gunn profiler-ready guard and 1.2 s, then arms
the existing profiler at native tick 480. Paired start snapshots must match;
fixed-tick path witnesses continue through 960. Missing readiness fails instead
of changing native time or inputs. A failed sample keeps the profiler's summary
title and start status. Frame, CPU and cost checks are unchanged.
All processes are closed. This source repair awaits the exclusive measurement slot.

## Remaining

Run the matched measurements, simplify the existing distant view only if needed,
then source review and current lane/build. This card blocks Convoy release.

## Removed

Nothing replaced. Runtime geometry, approved appearance and disposal are unchanged.
