# ARDENNES-DAMP-FADE

Found in Claude's finishing pass on Ardennes (P4-FINISH-ARDENNES round 1, 15 October 2026).

## The fault

The damp-road look on Ardennes starts and stops with a hard straight line across the road. It shows most at the start of Kestrel Straight (s about 970), seen from The Wall: light grey asphalt before the line, dark blue-black after it. The ends of the Forest Run and Whitewood stretches, and the first-lap mist stretches, have the same edge. Picture: `.evidence/2026-10-15/P4-FINISH-ARDENNES/views/ardennes-the-wall-high-first-lap.png` and `ardennes-kestrel-straight-high-first-lap.png` in the integration folder.

Cause: in `src/road-surface.js` the damp mask uses `step()` at both ends of each `roadShadeRanges` and `roadMistRanges` entry.

## Settled rule

- Fade the damp mask in and out over about 25 m at each end of every damp and mist range, for example with `smoothstep(range.x - 25.0, range.x, station)` on entry and the mirror on exit. Keep the same full-strength stretch between the ends.
- Only the opt-in `dampRoad` path changes. Every course without `dampRoad` keeps today's material, shader and program key exactly.
- Ranges that touch the lap start or end must still fade correctly across the wrap.
- No change to road geometry, grip or any other course.

## Acceptance

- The existing `tools/test-road-surface.mjs` gains a case showing the opt-in path fades and the default path is unchanged.
- One native Ardennes view from The Wall (High) shows no hard line across the road at Kestrel's start; Claude judges the picture.
- Lane tier, build, one review.


## Root implementation slice

Implemented as a named subtask of the existing ARDENNES-SWITCH-ON lane, keeping this settled rule and acceptance intact. No extra lane or duplicate implementation. The source card remains the decision record; the parent owns code, review, gates and the final release handoff.
