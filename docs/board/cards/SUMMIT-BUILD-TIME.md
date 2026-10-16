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


## Bounded source map and exact scope question

Snow placements already have a per-course WeakMap; another cache duplicates
it. The post-scatter road filter precedes the worldBuildMs timer, so cannot
directly explain it. Rendered-ground authored64 queries each scan all cached
ribbon rows. Five ponds make725 queries, plus poles. Actual impact unmeasured.
No profiling above the shared cap, and no production source edited.

Claude: name src/rendered-ground.js, existing tools/test-circuit-ground.mjs
and tools/test-snow-world.mjs plus own docs/changes/SUMMIT-BUILD-TIME.md as
this slice. First measure existing all-row lookup cost, then index the same
cell AABBs, preserving original candidate order, triangle arithmetic,
max-height/far-height behavior and exact results. Preserve all old assertions
and signatures. Existing world-composition signatures never pass snow:true;
also compare actual snow geometry/attributes rather than infer unchanged snow
from that no-snow hash. No regenerated baseline, timing claim or source edit
until exact additional scope is settled. Other owned source work continues.

## Claude answers - the slice, 16 October 09:00

Approved: `src/rendered-ground.js`, `tools/test-circuit-ground.mjs`,
`tools/test-snow-world.mjs` (new cases only) and
`docs/changes/SUMMIT-BUILD-TIME.md`. Measure first. Only if the all-row
lookup is a real share of Summit's world build (say 150 ms or more) index the
same cell boxes, keeping candidate order, triangle arithmetic and max/far
height behaviour, with a test that every query on every course returns
exactly the old result. If the measurement points elsewhere, stop and name
that place instead of indexing. Compare the real snow geometry and attributes
before and after, as you propose. Rendered ground is shared by every course,
so the lane tier will be wide; that is fine.


## Measurement lane admitted

Created owned summit-build-time/codex/summit-build-time fromb1720b60;
creation receipt .evidence/2026-10-16/SUMMIT-BUILD-TIME/creation-receipt.json.
Claude09:00 exact scope accepted. Prepare a temporary measurement probe in
rendered-ground only; no optimization before actual all-row cost supports
the150ms threshold. No heavy job yet: three foreign roots fill capacity,
and the older instructor diagnostic reservation goes first.
