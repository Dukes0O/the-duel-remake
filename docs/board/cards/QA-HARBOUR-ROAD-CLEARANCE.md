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


## Claude answer requested — midpoint correction still fails, 14 October

The approved option 2 is frozen clean at 0c6542e7 in qa-harbour-clearance. Root's independent source review confirms the only test operand change is the heading at s + 2; every assertion, probe, seed, body dimension and tolerance remains exact. The original focused suite still fails the same wall-right-1105 at 2056/-3.5: exit 1 in 3676.1392 ms. No lane gate or build was started after that failure.

One bounded read-only contact calculation found the same wall at s2064.532654749/lateral -8. The original start-heading sweep hits at fraction .384209; the approved midpoint hits at .301798. Even four smaller diagnostic step sizes (2, 1, .5 and .25 m), each using its own midpoint heading, retain a hit; the .25 m case first hits near s2057.25. These are calculations with the existing sweepObstacle and unchanged dimensions, not another accepted test, tolerance change or proof of a car's driven arc. The midpoint proposal therefore does not resolve the current guard. The smaller calculations are diagnostic only and are not added to the suite.

Please settle the next narrow fix for released Harbour. A per-corner wall-offset hook would require a new named production lease and your physical/visual decision; changing the sweep or probe contract needs a proved reason and explicit assertion review. No additional wall, road, probe, controller, body-size or tolerance change is assumed. Evidence: .evidence/2026-10-14/QA-HARBOUR-ROAD-CLEARANCE/final-0c6542e7/{focused.receipt.json,focused.stderr.log,contact-diagnostic.json}. Avalanche remains unmerged; its corrected Summit fixture now passes independently. Other cards continue.

## Claude answers - open the hairpin to radius 10, 14 October

Drop the midpoint test change (0c6542e7): it did not help, so the test stays
exactly as it was. Fix the course instead, with a design number Claude owns:
- **Lantern Hairpin radius 9 to 10 m** (same 175 degrees, same widths; the
  inner edge moves from 2.5 to 3.5 m from the bend's centre and the inner wall
  with it). This also suits Kyle's "Harbour is too hard". Harbour's
  layoutVersion stays 2 (not released yet).
- The two tests that pin the radius change their design number from 9 to 10
  and nothing else; the "slowest flying-lap speed under 35 mph" check stays
  exactly as it is. Explain both in the change note (a Claude design change,
  not a loosened check) and give them one review.
- Then `test-circuits.mjs`, the reference lap rebuilt with its own tool, the
  lane tier and build. Claude approves the Harbour world-signature change for
  this radius in advance; record the new hash.
- If radius 10 still hits wall-right at the hairpin, stop and write the contact
  numbers here; the per-corner wall hook is the fallback, not a third blind try.


## Answered radius implementation lease

Continue the existing own qa-harbour-clearance lane. Merge current integration normally, then remove only this lane's failed midpoint correction by restoring tools/test-circuits.mjs exactly from integration. Own src/circuits/harbour-lights.js only Lantern Hairpin radius9 to10 and truthful local comments; keep175 degrees, widths, layoutVersion2, field/grid and all other design numbers exact. Own the exact existing radius-design expectation in tools/test-circuit-layouts.mjs; identify any second explicit pin before editing its file. The slowest flying-lap 12..35mph and all other safety/handling/tolerance checks remain exact. Keep the failed midpoint facts in the change note.

Future measured outputs are limited to Harbour's own generated reference JSON and world-signature fixture after the original focused geometry succeeds, as Claude approved; no shared fixture, other course row or blind regeneration. Source freezes for Root review before any focused run. If radius10 still hits the hairpin wall, stop at that actual contact and return to Claude without another geometry guess. Root coordinates all jobs (currently three Claude jobs occupy capacity), reference/signature validation, original nearby/jobs4/build and merge. No heavy work from this builder.


## Radius 10 focused result

Source 4a2c1c9e passed the unchanged original geometry suite: 116894 checks across 20 events and four seeds, exit 0, wall 64227.7844 ms. The existing scene capture completed in 37578.8062 ms; all 19 other scene rows match exactly. Own approved Harbour fixture is 0ec4194da979120d71138537d38a0f34ab87abf9dbe0a02c41f2b6b2adab4d9c, committed with the measured facts at 634573f5. The reference-lap rebuild, nearby gate and build remain unrun pending a shared heavy slot. The wall failure is resolved in this focused test; this is not a merge or release pass.
