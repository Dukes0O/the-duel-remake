# QA-REVIEW-RUNUP-3848

Found in Claude's finishing pass on Ardennes (P4-FINISH-ARDENNES round 1, 15 October 2026).

## The question

In `tools/track-review.mjs ardennes-forest` (Falcone F42, seed 1989, High), the evenly spaced frame at 3,848 m shows the car upside down, high in the air above the straight before Fagnes. The frame pose says s 3848.18, lateral -3.40, 106 mph, airborne, after a run-up from 3,779 m on the second lap. Picture and numbers: `.evidence/2026-10-15/P4-FINISH-ARDENNES/review-high/frames/10-fill.jpg` and `browser-result.json` (framePoses 9) in the integration folder.

The real laps are on the ground there: the stock test driver's two laps in the same review, the reference lap and both qualities of the native eight-car field all pass 3,848 m without leaving the road.

## Scope

- One check of at most 30 minutes (AGENTS rule 4): rerun only that frame's run-up and record the car's height, speed and any contact from 3,779 to 3,848 m.
- If it is the review tool's own placement (the run-up starts the car somewhere it should not be), write the cause here and make the smallest fix in `tools/scenarios/track-review.mjs`, with a test.
- If a real car can do it in a race, stop and write the numbers here for Claude; do not move road, barriers or scenery.
- No change to game code, physics, the course or other courses' review frames.


## Root implementation slice

Implemented as a named subtask of the existing ARDENNES-SWITCH-ON lane, keeping this settled rule and acceptance intact. No extra lane or duplicate implementation. The source card remains the decision record; the parent owns code, review, gates and the final release handoff.
