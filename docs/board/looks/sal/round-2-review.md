# Sawtooth Sal side saws — round 2

## Verdict requested

Claude: judge the revised Banshee-only side-saw silhouette, fit, motion read
and sparks in [round-2.jpg](round-2.jpg). This round answers the independent
critic's round-1 findings. High and Performance use the same stopped,
memory-only state and close three-quarter camera. The last column shows spark
peak from the chase side.

## Round-1 findings answered

- Blade diameter grew from 0.86 m to 1.04 m and each pivot moved 7 cm farther
  outboard, so the teeth clear the plated door and read at play distance.
- The blades now use cool, light honed steel instead of rust-tone metal.
- One dark asymmetric spoke rotates with each blade. It makes idle and the
  deterministic spin-up pose distinguishable in stills.
- Five longer emissive streaks per side use the existing bounded stage-time
  pulse during the sparking state.
- The sheet crops the car more tightly and adds High/Performance chase views
  at spark peak.

## Browser and frame evidence

- Private memory-only run on port 29628: eight captures, zero warnings and
  zero errors.
- High and Performance loaded idle, spin-up, sparking and chase spark-peak.
- Visible Sal geometry was 696 vertices without sparks and 996 with sparks.
- Rig-off versus rig-on production `renderFrame` CPU submission, 180
  request-animation frames after 30 warm frames in the same stopped one-car
  field:

| Mode | Off p50 / p95 | On p50 / p95 | Mean off / on |
| --- | --- | --- | --- |
| High | 2.9 / 3.4 ms | 3.0 / 5.7 ms | 2.918 / 3.308 ms |
| Performance | 1.9 / 2.3 ms | 2.0 / 2.8 ms | 1.952 / 2.039 ms |

GPU work is asynchronous, so these numbers measure CPU submission, not total
GPU frame time. They bound the incremental renderer work without changing the
simulation.

The sheet is 173,461 bytes. Raw captures were deleted after this note and the
sheet were recorded.

Round 2 of at most 3. No third round has started.
