# P4-DAYNIGHT: round two

Claude art verdict pending. [The round-two sheet](round-2.jpg) uses the eight
native captures from source `65d72ec1dbde23994bee116a274ac6c2debae476`.
It is 436,282 bytes. The existing composition recipe resized each complete
1280 x 800 capture to 640 x 400; no crop, relight, substitution or rerender.
High is the top row; Performance is the bottom row. Columns are day, golden,
dusk and night. The native Harbor camera, eight cars and seed match round one.

The single native run on private port 51149 passed all eight captures with
zero warnings and errors, memory-only saves, exact legacy sky/material restore,
and unchanged race state/profile. Frame measurement was off: current-source
frame watch remains pending. The prior-source timing exception does not apply
to the changed round-two rendering source.

Corrections submitted: sun gone by dusk, no sunset HDR contribution at night,
selective native window emission, red soft rear glow independent of bloom,
bounded headlamp emission, native streetlamp heads/road pools, visible fixed
moon and antialiased stars. The focused headless test passed 523 checks.
The added native lamp/glow witness requires a separate authorized native run;
its stronger assertions are not claimed as passed by these earlier captures.

## Removed

No extra review sheet or raw capture is committed. Round-one verdict remains
available while Claude evaluates the requested corrections. Runtime removals
are recorded in the task change note.
