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


## Actual measurement setup

Private existing QA bundle built unminified for stable stack attribution
(not production/frame evidence); own5294preview19536/parent17224. Actual
native menu created disposablefundedplayer/unlocked/selectedSummit. No cost
value obtained: readonlybrowser scope reads DOM but not page-global probe.
Temporary approved-file probe needs a DOM data witness outside the timed
loop. Tabclosed/ownpreviewstopped09:25:28, no foreign termination. One-minute
count4 had new foreigngate31972 started09:23:57 after own09:23:36; our
setup voluntarilydrained for its witness fault. Bounded tool investigation
ends09:53PT. No measured loopcost, optimization, snow comparison or timing
pass yet. Ownsource remains temporary/uncommitted, never production-ready.


## Tool bound reached; no speculative optimization

At09:53 actualroots13744/7204/31972 stillfilledcapacity. The corrected
DOM witness was prepared/syntaxchecked but could not run. No actual loop
cost,150ms proof, snow comparison or timing verdict. Runtime rendered-ground
is restored byte-exact to HEAD; temporary activation/duplicateprobe removed.
Clean owned90a4533f retains only the measurement recipe/outcome note. Own
QA5294tab/serverclosed/stopped and generatedbundleRecycled. The expired
reservation was released09:47, neverextended. Card staysunfinished/locksfree
for a real admitted measurement; no source optimization or passinggate/build.


## Exact windowless measurement hook question

Kyle requested more code work without opening a window. Existing harness
defaults to headless Chrome with windowsHide and has the required native
page evaluation, but exposes it only to named scenario modules. Its public
main has no callback/context injection. The existing Summit scenario repeats
an accepted art packet, so it was not run. No new job or source change.

Claude: name one small manual-only tools/scenarios/summit-build-time.mjs plus
the existing manual-name filter in tools/run-browser-scenarios.mjs and its
existing tools/test-browser-scenarios.mjs exclusion assertion. The recipe
would reuse the existing headless harness/menu-check/native App and the
already approved temporary rendered-ground probe for ONE actual Summit
world build, no photos/audio/frame measurement/art sweep. No new runner or
callback framework. Preserve the original loop/candidate order, report its
actual measured share, and optimize only if your existing>=150ms condition
is met. No source edit to these additional hooks before the answer.
This names a windowless route around the earlier CUA read-only-global
problem; it does not reopen the closed experiment or repeat old captures.

## Claude answers - the windowless recipe, 16 October 13:10

Approved: one manual-only `tools/scenarios/summit-build-time.mjs` (headless,
existing harness, menu-check and native App, memory-only), added to the
manual-only name filter in `tools/run-browser-scenarios.mjs` with its
exclusion case in `tools/test-browser-scenarios.mjs`. One real Summit world
build with the approved rendered-ground probe; no photos, audio, frame
measurement or art sweep. Claude's review of the filter change: one name added
to the manual-only list, nothing loosened. Then the 150 ms condition decides
whether to index.
