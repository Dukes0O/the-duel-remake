# ARDENNES-PIT-GRASS

Found in Claude's finishing pass on Ardennes (P4-FINISH-ARDENNES round 1, 15 October 2026).

## The fault

Grass tufts stand on the paved pit-lane apron on the inside of La Fontaine (s about 330 to 360), so the grass grows through the asphalt. Picture: `.evidence/2026-10-15/P4-FINISH-ARDENNES/views/ardennes-la-fontaine-high-first-lap.png` in the integration folder (bottom left).

Cause: the tufts in `src/landscape-detail.js` are scattered 8.5 to 38 m either side of the road centre without checking for the pit-lane surface.

## Settled rule

- Grass tufts and small plants never stand on a paved pit-lane surface. Skip any tuft whose point lies on the pit lane (use the course's existing pit-lane query; do not add a second description of where the pit lane is).
- Skipping must not change the random sequence for any other placement, so courses without a pit lane, and every placement away from the pit lane, stay exactly where they are today. If that cannot be done, stop and ask.
- No change to the road, the pit lane, collisions or race state.

## Acceptance

- A test shows no tuft inside the pit lane on Ardennes and Panorama Ridge, and unchanged placements on a course without a pit lane.
- World signatures: courses whose picture changes need a reviewed visual difference before their signature is recaptured (AGENTS).
- Lane tier, build, one review.


## Root implementation slice

Implemented as a named subtask of the existing ARDENNES-SWITCH-ON lane, keeping this settled rule and acceptance intact. No extra lane or duplicate implementation. The source card remains the decision record; the parent owns code, review, gates and the final release handoff.
