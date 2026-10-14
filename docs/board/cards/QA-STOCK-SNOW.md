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
