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


## One-frame run-up diagnosis: stale review flight height

Bounded native reconstruction on f80041aa uses the retained preceding grounded pose9438.632471/-1.165402 and the exact next frame3847.878822/119mph/-3.4. Prior support and therefore grounded _jumpY is -5.168058m; next run-up starts at phase3778.798227 on support -49.143180m. Existing R.place teleports s/lateral and sets airHeight0 but leaves _jumpY and vertical velocity. First native step becomes43.9818m airborne, no contact/crash. At target3848.296207 it remains22.4822m high/106.0329mph after94steps, matching the reported false-flight shape. Actual full historical state was not saved: reconstruction explicitly zeroes unknown previous vertical velocity; this is not a recovered original browser state. Source proves the stale-height mechanism; no road/physics fault is inferred. Evidence local runup-before.json includes every step/support/velocity/contact.

Smallest granted tool-only fix: reset latent flight pose when this existing scenario teleports an Ardennes car, so _jump initializes from the new native road. Clear airborne/prevAirHeight/_jumpY/_verticalSpeed/_jumpOrigin/_airOrigin/air distance/time only, plus the existing placement assignments. Keep race progress/results/counters/driver/input policies and other courses review placements exact. Add the regression in existing test-track-review; use the actual reset function in injected page code. No new harness, full packet retake, source physics or scenery edit. One independent source confirmation and final nearby/build remain required.


Tool-only55952005 regression GREEN: exact same119mph native run-up/94steps reaches phase3848.296207 at106.0329mph with maxairHeight0/every stepgrounded and0crashes. It preserves race history/results/clock and resets latentflight only on Ardennes reviewteleports; other courses placement remains exact. Independent confirmation requested. No full historical packet recovery or fullphoto rerun claim.
