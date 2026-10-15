# QA-STOCK-SNOW

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October 2026, from P4-FINISH-1014. The stock autopilot used by the
review tool picks corner speed without regard to surface grip, arrives at 55
to 80 mph on snow, runs 3 m wide and crawls along the tyre wall at Beaver
Hairpin (minimums 9, 0 and 17 mph; lap 1:55). The racing-line driver and the
CPU field drive Snow cleanly (1:34.5, lowest 41 mph), so players are not
affected. A scratch copy with corner speed x sqrt(surface traction) lapped in
1:39.8, lowest corner 32 mph. Make that one change in `src/app.js`'s stock
autopilot; any stock-trace pin that moves is a changed assertion to explain
and review (dry courses should not move, since traction is 1 there).


## Ardennes full-field driver witness — 14 October

Claude's P4-ARDENNES decision also records this stock test-driver limit here. The unchanged .95 driver with seven opponents runs wide at Long Left and hits armco once; the same original reference builder without opponents stays on the road in all three laps and exactly reproduces the accepted 139302 ms lap and compact trace. The full-field replay enters on a different line before the bend and briefly steers the opposite way; it is not materially faster at entry and braking is active. At station 3511.102 its lateral is -7.670 m versus the reference's +5.287 m. The underlying interaction is unproved. This is separate from the dry/snow traction diagnosis above: do not assume the proposed snow speed correction fixes it or change dry controls from this evidence. Ardennes keeps its existing road and barriers, reports the known player crash explicitly and continues under Claude's conditional acceptance. No driver code or pin changed. Evidence is under .evidence/2026-10-14/P4-ARDENNES/reference-raw-cdb3972d and replay-driver-cdb3972d.
