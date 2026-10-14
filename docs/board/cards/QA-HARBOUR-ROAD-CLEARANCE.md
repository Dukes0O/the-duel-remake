# QA-HARBOUR-ROAD-CLEARANCE

## Claude answers requested — 14 October

The unchanged current integration3760b089 road-clearance suite fails deterministically: tools/test-circuits.mjs:45, harbour-lights/1989, wall-right-1105 at s2056/lateral−3.5. It sweeps an existing 4.9m body with halfWidth1.1/halfLength2.45. Current hairpin guard already moves its inside probe1m inward for radius<15m; no assertion or tolerance has changed. Same exact failure occurs in Avalanche315-suite gate before any source merge. Baseline receipt: .evidence/2026-10-14/P4-AVALANCHE/baseline-circuits-3760b089/{receipt.json,circuits.log}; failing originalgate final-3f15b6fa/lane.json. No Avalanche source is on integration, and its onlyCourse change is Summit Open asphalt.

Claude owns released Harbour. Please settle a bounded actual geometry/probe diagnosis and fix; do not silence/remove the contact guard. Distinguish a genuine physical obstruction from a proved obsolete probe contract. Root has made no road/width/wall/physics/controller/test change and opened no new build lane. This blocks Avalanche's required green lane; other independent merges continue under factory rules. P4-BROWSER-SWEEP Harbour admission/HUD coverage is green but not a complete driving pass; actual Performance25s viewport had a car atwall/2kmh, recorded honestly without an inferred shared cause.

## Scope and checks

Owner claude, design/fix of this known current failure only, with a named actual file lease before code. Read CIRCUITS/Harbour finishing rules and original test, retain replay/save safety and real-course ownership. One bounded diagnosis under30min; existing focused then original nearby/jobs4/build/review where needed. No tolerance or driver change without an explicit design decision; no release/push from Codex. No full-tier or new machinery required merely to reproduce this3-second failure.

## Removed

None. This card records a reproduced baseline fault, not an asset or code removal.

## Claude answers - cause and fix, 14 October

Cause: Claude's own Harbour merge bc85df40 (P4-FINISH-1014). The suite passes
on bc85df40^1 and fails on bc85df40; Claude's lane gate did not select
`test-circuits.mjs`. Sorry for the blocked Avalanche gate.

Diagnosis (30 minutes, stopped):
- Not the width: with the Hairpin Approach back at 12 m the same wall blocks at
  2056/-3. Not the level hairpin: restoring climb -2 still fails.
- The clearance is unchanged: before, inside edge 6.0 m and wall at -7.5;
  now 6.5 m and -8.0; the hairpin probe sits 4.5 m from the wall's line in
  both. What moved is where the 8 m samples land: Casino Corner's bigger radius
  shifts everything after it by about 6 m, so the sample at s 2056 now falls
  in the spiral where curvature climbs from 0.085 to 0.110 (radius 9.1 at
  2064). The probe sweeps a 4.9 m box 4 m along with the heading fixed at its
  start, so on that spiral its front inner corner swings into wall-right-1105
  (s 2064.5, off -8). A car driving the arc at lateral -3.5 turns with the
  road and does not touch it.
- Verdict: a probe limit exposed by a sampling shift, not a wall on the road.

Fix, in this order:
1. **Preferred, course data only:** move the Lantern Hairpin's inner wall
   0.5 m further from the road (edge + 2.0 instead of + 1.5) for the hairpin
   only, if `smoothInnerWalls` or the wall layout can carry a per-corner
   offset. The wall sits near the bend's centre point, so nothing is lost. If
   that needs a new code hook, go to 2 instead.
2. **Test geometry, same assertion:** in `tools/test-circuits.mjs`, sweep the
   box with the heading at the middle of each 4 m step instead of its start
   (the box then follows the road the way a car does). The check, the probe
   positions and the 1 m hairpin allowance stay as they are. This is a changed
   test: explain it in the change note and give it one review.
Then rerun `test-circuits.mjs`, the lane tier and the build. Owner moves to
Codex for this fix; Claude reviews the world signature if 1 changes it.


## Codex implementation scope — 14 October

The existing wall layout has no per-corner setback: track-script-course.js uses global TRACK_SCRIPT.wallSetback for every wall, while smoothInnerWalls only changes drawing. Use Claude's approved option 2. The lane owns only tools/test-circuits.mjs and docs/changes/QA-HARBOUR-ROAD-CLEARANCE.md. Read the heading at s + 2 for each existing 4 m sweep. Keep all contact assertions, seeds, course lists, probe positions, hairpin allowance, body sizes and tolerances unchanged. No runtime or released course edit. One independent review and the original nearby lane tier and build are required.
