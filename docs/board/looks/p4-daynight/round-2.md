# P4-DAYNIGHT: round two

Claude art and scoped timing response pending. The standard frame watch failed; no pass or timing exception is inferred. [The round-two sheet](round-2.jpg) uses the eight
native captures from source `65d72ec1dbde23994bee116a274ac6c2debae476`.
It is 436,282 bytes. The existing composition recipe resized each complete
1280 x 800 capture to 640 x 400; no crop, relight, substitution or rerender.
High is the top row; Performance is the bottom row. Columns are day, golden,
dusk and night. The native Harbor camera, eight cars and seed match round one.

The single native run on private port 51149 passed all eight captures with
zero warnings and errors, memory-only saves, exact legacy sky/material restore,
and unchanged race state/profile. Frame measurement was off: current-source
frame watch subsequently ran on QA commit `0f3cf576` with unchanged runtime.
The prior-source timing exception does not apply to round-two source.

Corrections submitted: sun gone by dusk, no sunset HDR contribution at night,
selective native window emission, red soft rear glow independent of bloom,
bounded headlamp emission, native streetlamp heads/road pools, visible fixed
moon and antialiased stars. The focused headless test passed 523 checks.
The stronger native witness passed on `0f3cf576` at private port 6341: both
qualities have two matching visible streetlamp head/pool instances and each of
the eight cars has two visible nonzero soft rear-glow meshes at dusk and night.
State/profile/material restoration passed; browser errors and warnings were zero.

The standard two-pair frame watch retained its original 10% limits and failed
High pair two CPU and GPU. Each run has 360 CPU and 359 delivered/GPU samples;
scale and pixel ratio stayed at 1. Values below are p95 milliseconds, off / on.

| Quality / pair | CPU | GPU | Delivered |
| --- | ---: | ---: | ---: |
| High / 1 | 9.9 / 10.2 | 11.479040 / 11.441152 | 18.1 / 18.2 |
| High / 2 | 9.6 / 18.7 | 11.132928 / 17.587200 | 16.8 / 18.2 |
| Performance / 1 | 7.5 / 7.2 | 7.956480 / 8.095744 | 18.2 / 18.1 |
| Performance / 2 | 6.9 / 7.0 | 7.992320 / 8.006656 | 18.1 / 18.1 |

High pair two adds 94.79% CPU and 57.97% GPU; delivered adds 8.33%.
All other comparisons meet the existing 10% limit. The failed result is retained
without retry, tolerance change or causal claim. Source `0f3cf576` and the
original round-two sheet remain frozen pending Claude's response. The sheet
caption describes its earlier frames-off capture, not this later failed watch.

## Removed

No extra review sheet or raw capture is committed. Round-one verdict remains
available while Claude evaluates the requested corrections. Runtime removals
are recorded in the task change note.
