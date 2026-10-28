# QA-STOCK-SNOW

Task: QA-STOCK-SNOW. Kind: stock test-driver correction. Status: built, required lane/build/review pending. No new feature switch.

The App stock planner now includes actual snow, deep-snow and ice traction inside its corner-speed square root. Its existing straight cap, steering, pit target, throttle/brake thresholds and every other surface remain unchanged. No physical grip, player controls, CPU driver, line driver, saved state or asset changes.

## Acceptance and changed assertions

Added three cases to the existing race-surfaces suite; no old assertion or pin changed. Before the source edit, actual stock Snow nearly stopped at Beaver Hairpin (0.0244 mph) and the snow-braking regression failed. Recorded the pre-change dry planner fingerprint e34f36062af5913457174832e002aba59c7edf43a759623cf704f224a7da2cca over 400 input cases, including winter asphalt and shoulder/off-road/mud traction values. That pin stays exact after the change. Winter cases cover both tyre grips, the 40% ice floor, deep snow, unchanged steering and the original straight cap. The actual App stock driver runs the existing driveCircuit recipe with memory-only storage, Falcone, Casual, seed1989, winter tyres and no opponents; no line-driver substitution.

Initial changed-source native simulation completed all three Snow laps in303.33s (103.180/100.075/100.075), zero crashes or resets, zero stuck time; overall post-start minimum32.147mph, Beaver first-lap minimum39.366mph. The final acceptance checks turn minima on all laps using wrapped station and requires each at least20mph. No new capture or timing claim. This does not fix or re-test Ardennes' separate passing issue.

## Verification

Existing race-surfaces suite:15/15 passed before the final all-lap observation correction. Final targeted lane/jobs4, production build and independent source review are required before merge; their actual results belong in the integration handoff.

## Removed

Replaced only the winter-blind corner-speed operand. No scratch output or superseded runtime assets are needed.
