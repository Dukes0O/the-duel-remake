# NISSAN-SKYLINE-GTR-R34-V2: shape round 2

Status: built for round 2 review. Kind: art. Flag: nissan-skyline, dev.

## Changed

Claude's round 1 verdict: FAIL, it reads as a generic old saloon, not an R34.
Round 2 follows the latest brief. The roof is about 10 percent lower and the
cabin moves forward, with a sloping rear screen and short rear deck. The
bonnet stays level into a high square nose. Added visible arch lips, wider
tyres, larger six-spoke silver alloys, side creases, black window seals,
corner-wrap headlights, round fog lamps and mesh in both front intakes.
The tall wing spans almost the full body width. Four round rear lamps stay
in the blue panel, with larger outer lamps. A single large right-side outlet
replaces the twin tips, with a wider black diffuser. The blue metallic paint
and left-seat driver remain. No maker mesh, texture or badge.

Only this builder and its review recipe change. No new dependencies, game
events, sounds, handling, saves, car pool, world or other vehicle changes.

## Checks

The headless model contract passes 272 checks, with 54,198 visible triangles
and 48 draws, below 60,000/56. No player storage accessed.
All four final reference/model pairs were inspected. Shape-stage resemblance,
static readability, grounding, consistency and geometry cost self-score 4/5;
this is not a driving, frame or release verdict. Five detail-stage limits are
recorded in the round review. Claude's art verdict is pending.
The final sheet is 255,806 bytes. The exact requested scratchpad file is copied
and verified byte-identical by SHA-256. Round 1's sheet was recycled.
The independent code review is clear, including the final paint and wing
adjustments. Review fixed the exhaust clearing the diffuser and seals exposed
inside painted pillars. All 60 selected lane suites are covered by green results, jobs 2 throughout:
29 passed before a sandbox-blocked PowerShell subprocess in test-full-check
(208.76 s); the failed/unrun-only retry passed 20 before review-evidence
noticed the unstaged removed sheet (149.39 s); after staging, three more
passed before its matching-note filename check (9.56 s); renaming the note
to round-2-review.md gave 8/8, zero unrun (140.85 s). Passing suites were not
repeated. No assertions were changed for these infrastructure corrections.
Replay fingerprints: 225 checks across 25 cases and 23 events unchanged;
combat replay and all 47 complete-scene/immutable-feature guards pass.
Production build passes: 600 modules, 1.06 s. Existing chunk-size and mixed
static/dynamic import warnings remain. The linked dependencies lack vite.cmd, so a
temporary lane-only command calls the installed Vite CLI. Its native config
loader avoids Vite's default attempt to write through the shared dependency
link. No dependency install or shared dependency edit.
No browser scenario or frame measurement applies to this shape-only round.

## Changed assertions

The existing model test follows the revised dimensions with unchanged
tolerances: height 1.38 to 1.25 m, tyre radius .34 to .37 m, and wheel travel
uses .37 m. The roof ray follows the driver's forward seat position; exposed
headlight rays follow the raised lenses. One exhaust now requires exactly one
boost flame rather than two. These changes describe the requested geometry;
no damage, clearance, budget, grounding, isolation or reset assertion is
removed or relaxed. Claude's written review of these assertion changes is
still required before merge. Round 1's separate flag-count review remains
pending on the card.

## Removed

The superseded round-1.jpg is removed in this commit. The old review.md is
replaced by the required matching round-2-review.md, carrying Claude's verdict
and the current review rather than retaining a second old note. The old wedge bonnet,
rearward tall cabin, small five-spoke wheel shape and twin tips are replaced
in the same builder. Only the current comparison sheet is retained. Review GLB and renders went
to the Recycle Bin after the visual verdict was recorded. The temporary build and command shim were also recycled. No runtime binary added.

## Handoff

Stop after round 2. Claude decides the art verdict and any next round.
No merge, push, release, browser session, frame timing or live-game action.
