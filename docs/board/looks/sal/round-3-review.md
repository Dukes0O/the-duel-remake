# Sawtooth Sal side saws — round 3

## Final verdict

Independent review passed. All eight views scored at least 4 for art
direction, racing-speed read, grounding, materials and lighting, motion and
timing, road/HUD/rival clearance, and frame cost. The reviewer found that the
unequal angled streaks start at the blade edge, read as sparks rather than a
rigid comb, and stay contained in High and Performance close and chase views.
The sheet is fit to hand to Claude.

## Round-2 blocker answered

Only the spark treatment changed. The five long parallel rods were replaced
with a small fan of unequal short streaks emitted from each blade edge. Each
streak has a white-hot core and orange tip. The renderer deterministically
varies visibility, scale and angle from the existing presentation time, so
the peak does not form a static comb. The accepted blade size, outboard
clearance, steel contrast, asymmetric spoke, cameras and frame checks did not
change.

## Browser and frame evidence

- Private memory-only run on port 49451: eight captures, zero warnings and
  zero errors.
- High and Performance loaded idle, spin-up, sparking and chase spark-peak.
- Visible Sal geometry was 696 vertices without sparks and 1,116 at the
  captured sparking phases.
- Rig-off versus rig-on production `renderFrame` CPU submission, 180
  request-animation frames after 30 warm frames in the same stopped one-car
  field:

| Mode | Off p50 / p95 | On p50 / p95 | Mean off / on |
| --- | --- | --- | --- |
| High | 3.0 / 3.6 ms | 3.1 / 3.9 ms | 3.059 / 3.192 ms |
| Performance | 2.0 / 3.2 ms | 2.0 / 2.3 ms | 2.054 / 1.974 ms |

GPU work is asynchronous, so these figures measure CPU submission, not total
GPU frame time. They bound the renderer work without changing the simulation.

The sheet is 173,050 bytes. Raw captures were deleted after the final verdict
was recorded.

Round 3 of 3. The art-round cap is exhausted.
