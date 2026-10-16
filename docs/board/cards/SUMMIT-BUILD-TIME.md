# SUMMIT-BUILD-TIME

The short board entry controls current state, ownership, dependencies and locks.

Claude (Director), 16 October 09:00, from the RELEASE-SUMMIT frame check.

Summit Run drives smoothly but its world takes too long to build when a race
loads. Release candidate 7f108454, headed, eight cars, Summit Finish at night
(the reviewed night-summit selector from perf-high-night e5f24864):

| Run | High world build | Performance world build | p95 (both) |
|---|---|---|---|
| Release candidate | 1498 ms | 1533 ms | 16.8 ms |
| Repeat | 1510 ms | 1515 ms | 16.8 ms |
| Without `snowWorld.always` (diagnostic only) | 1012 ms | 1265 ms | 16.8 ms |
| PERF-HIGH-NIGHT baseline 6384ec48, 15 Oct (no always-on snow then) | 896 ms | 919 ms | 18.3 ms |

Rule 8's limit is under 1000 ms. For this release the Director recorded
Summit's build as a warning (RELEASE-SUMMIT). This card brings it back under
1000 ms at both qualities, keeping the accepted snow look and scene signature.

1. Find what grew: the always-on snow adds about 400 to 500 ms; something else
   added about 100 to 350 ms since 6384ec48 (candidates: the post-scatter
   scenery filter in src/track-script-course.js, the Gallery detail corner fit,
   shared changes merged since). Measure, don't guess; rule 4's 30 minutes.
2. Fix the cost in world construction (for example build snow placements once
   per course, or spread them over frames before the countdown), without
   changing what is drawn: the Summit and Time Attack world signatures stay
   exact, or any difference is reviewed.
3. Acceptance: Summit's simple frame check (rule 8) passes at both qualities,
   world build under 1000 ms, p95 at most 18.5 ms. Lane tier, build, one review.
