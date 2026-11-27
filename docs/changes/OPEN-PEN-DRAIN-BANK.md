# OPEN-PEN-DRAIN-BANK ? round 2
Cause: the drawn pipe had no interior support; the mover and camera queried the land above it.
Fix: restore integration terrain; install a site-scoped pipe floor with the drawn inner radius and short mouth aprons.
The real foot mover follows its floor, meets its inner walls and ceiling, and keeps both camera modes inside.
The existing terrain shader clears only the bore at its mouths; the land above stays whole.
Keep: round 1 real-input drain/yard scenario, routed round the lean-to and pen wreck.
PASS before code commit: 105 floor samples, 12 drain walks and 3 yard routes on three seeds; wall, jump and camera checks.
Remaining requested checks and build: pending on the code commit.
Assertion restored: `test-rats-nest-look` matches integration exactly, including ?the drain runs under uncut land?.
No signatures re-recorded. Browser scenarios left to Claude as directed. No new event or sound cue.
**Removed**: round 1?s open 9 m trench (`drainDepth`) and its replacement of the uncut-land assertion.
