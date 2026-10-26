# HELI-VIEW-FRAMES

The short board entry controls current state, ownership, dependencies and locks.

Heli-skiing and rescue went live on 26 October 2026 without a frame check:
no timing recipe exists for their views, and Kyle wanted to test them in the
real game (races are unaffected; Summit was timed that evening). Add opt-in
options to `tools/scenarios/frame-pacing.mjs` like `SUMMIT_FRAMES_ONLY`:
`SKI_FRAMES_ONLY` (moguls run at Summit, skier view, both qualities) and
`RESCUE_FRAMES_ONLY` (hovering over the Summit avalanche with the line out,
both qualities), using the same guards (headed, idle, alone) and rule 8's
limits. Do not run the timing; Claude runs it with the screen off. Lane tier
and build.
