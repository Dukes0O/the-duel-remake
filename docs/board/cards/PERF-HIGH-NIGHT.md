# PERF-HIGH-NIGHT

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October 2026. Measured on a quiet laptop with the laptop panel off
(QA-FRAME-ENVIRONMENT): on Harbour at night with eight cars, Performance
delivers p95 16.8 ms but High delivers 33.3 ms on a 60 Hz screen (p50 16.7,
max 50), in two runs out of two. Headless frame times for High at night sit at
18.1 to 18.5 ms, so High needs just over one refresh on enough frames to miss
more than 5% of them.

Find what High adds over Performance at night (the composite pipeline, bloom,
shadows, the larger mirror, lantern and neon lights) and trim the cheapest
item that brings High under 16.7 ms for 95% of frames, without a visible loss
Claude would reject; show before and after pictures. Note that the scenario
times 120 frames starting in the countdown, right after loading; record
whether the slow frames cluster at the start. Rule 4's 30 minutes for the
search, then a note here. No change to limits or to the scenario's checks.
