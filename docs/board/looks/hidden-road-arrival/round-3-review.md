# Gate arrival: round 3 Director review

Reviewed physical-spur source `7ad8a32`, final transition source `bc60aa4`,
the actual driving image and time-labeled motion strip, and the four final
correction images captured on private port 49199. Final source review is
recorded in `af3e1db`. The final capture reports zero errors and warnings.

## Result

The presentation is accepted for development integration, subject to the
required clean lane tier and build and the independent gate-audio review.
All seven presentation look criteria score **4**, with the measurement
limits below. This does not promote hidden-road to beta: the separate
Rustwall/wash asset fidelity debt remains in EGG-02-P1.

- The phone and desktop choices leave the car and doorway visible.
- The time-labeled frames from the continuous canvas recording show the
  panel lifting, the car passing through the opening, and a clear inside
  endpoint. The canvas recording excludes the DOM dialog; dialog layout has
  separate actual browser images.
- The settled legacy Mad Max image shows the car above ground in the wash
  with its weapon strip faded. The earlier underground images remain as
  evidence of the repaired production camera defect.
- Final transition views agree with the physical spur camera. The captured
  Turn-back blend-boundary movement is 0.004 metres, closing the roughly
  ten-metre jump identified by source review.
- Car and gate contact are consistent in inspected frames. The underlying
  repeated rock shapes and sparse wall materials remain asset polish work.

## Corrected cost comparison

The original round 2 and round 3 disabled conditions omitted ordinary HUD
work, so their total CPU deltas cannot be attributed to this feature. Those
samples remain unchanged. The final QA-only hook skips only the new gate UI
update; both conditions run the same ordinary HUD and scene work. The hook
is inactive in normal production and reset after the sample.

| Quality | Total CPU p95, disabled to enabled | RAF p95 | Render submetric |
| --- | --- | --- | --- |
| High | 2.6 to 2.5 ms | 18.2 to 18.1 ms | 1.7 to 1.7 ms |
| Performance | 1.6 to 1.7 ms, +6.25% | 18.3 to 18.2 ms | 1.1 to 1.3 ms |

Both total CPU and frame-interval comparisons meet the ten-percent budget
in these short stationary samples. Each adds one draw with unchanged triangle
counts. The Performance render-call submetric rises about 18.2 percent even
though total CPU stays within budget; retain that detail rather than claiming
every component improved. These are 120-frame ordered samples, not GPU time,
worst-case races or statistical proof of a general speedup. No further cost
run is required for this card.

## Sound provenance

Audio source is unchanged from the valid round 2 recording. Reuse its actual
PCM, cue/event logs and plots instead of recording the same mix again. Keep
the distinction between the round 1 engine stem and round 2 ducked vehicle
bus, and retain the sample-rate and whole-race limitations already recorded.
The card change note must record independent audio review before handoff.
