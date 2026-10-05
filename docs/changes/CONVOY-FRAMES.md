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
First browser setup stopped before a sample: the yard was not presented after
advance. It now uses existing native presentation and waits for its real control.
The harness's isolated build passed; no frame-cost verdict or runtime change.

## Remaining

Run the matched measurements, simplify the existing distant view only if needed,
then source review and current lane/build. This card blocks Convoy release.

## Removed

Nothing replaced. Runtime geometry, approved appearance and disposal are unchanged.
