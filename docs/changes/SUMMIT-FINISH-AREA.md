# SUMMIT-FINISH-AREA

Status: round 2 ready for Claude; further art stopped. Kind: art.
Flag: existing `summit-run`.

## Round 2 design, before code

Merged current integration as `961b95da`, including Summit's continuous
ground. No code conflict; kept this lane's STATUS as Kyle instructed.
After the release pause, merged integration again as `8306db7e`; the only
conflict was STATUS, resolved with this lane's copy. This brings in the
updated terrain/map checks and helicopter return-load release. The first
round 2 gate was interrupted for that release and is not a pass.
Separate finish sheets now live in `looks/summit/finish-area/` because the
ground-gap card already uses `looks/summit/round-1.jpg`.

Follow Claude's round 1 verdict: hut 14 × 12 m, dome 14.4 m across, centres
17 m either side of the road and 16 m before the line. Add warm glazing,
SUMMIT lettering, gantry light and two fence lights. Turn twelve reused crowd
figures toward approaching cars. Grade only the finish terrace into the
continuous backing; the far-grid renderer and height reader share the grade.
No road/physics/Yeti placement or ski/rescue rule changes.

Pad question sent to Kyle: moving the hut to the line separates it from the
operational ski pad. Pending an answer, preserve the working pad and link its
yard with a packed path. This is an explicit exception still needing Claude's
decision, not a claim that the operational pad moved beside the hut.

Checks: focused `test-summit-finish-area` for actual level ground, native
height-query agreement, unchanged surrounding mountain and landmark sizes;
real High/LOD kit clearance; requested lane tier and build. Pictures: car
100 m/30 m before line, at line, helipad and wide; High/Performance, dusk/night.
Stop after the round 2 sheet. No frame timing or signature regeneration.

## Round 2 evidence

The 354,886-byte sheet is at
`docs/board/looks/summit/finish-area/round-2.jpg`: five requested views,
High/Performance, dusk/night. Twenty captures on private port 19038,
memory-only storage, zero errors/warnings. Captured source `b5c04d78`;
the later merge changes no finish-scene code or model, so the captures stand.
`tools/scenarios/summit-finish-area.mjs` records exact camera poses and verifies
race/profile/storage are unchanged. No round 3 run; verdict pending.

Focused checks pass: 27 actual level terrace vertices, 205,982 unchanged
mountain vertices outside the finish patch, 36 matching native height
queries, both landmark-size/placement claims, and 38 actual High/LOD kit
placements with road clearance. Code review is clear. Existing assertion
expressions are unchanged in round 2. The new focused test checks behaviour.
Cockpit sync ran through the protected runner: no changes.

Post-release lane gate reaches the unchanged `test-ground-rows-exact`
snapshot and fails for Summit's deliberate terrace/scenery change. Near-road
hash stays `845626385552bc485e8bc20d8c602a88011bc9b1e7ce7845c0d0af8f2dafbeb8`.
Far terrain is `3f03c09d0643c936132cd55d157ee6217fe455f840ff7ce17e60f79cbb6d26ca`
(baseline `69a916991e5cde171487997d4a4226cd56859388bf56a40c0065e3e5d6268f9f`).
Scenery is `28f7b419f2e9a3bbc46296fffc8e2444a5f4dbde5db75ebb40a8778cb0264d0c`
(baseline `1a05c479e1d732d29dde77608e859bfe57d819bd3d20c464242790e6eb7778f5`).
No baseline, tolerance or assertion is changed to get a pass. These snapshot
updates wait for Claude's accepted visual difference, alongside the scene
signature. No further art is run while the gate drains and the build runs.
Final post-release lane result on `8306db7e`: **51 passed, 1 failed, 34 not
run**, 406.03 s, jobs 4. `npm run build` passes (1.29 s); existing chunk-size
and dynamic-import warnings only. Both run in PowerShell with System32
first on PATH. No passing check is repeated and no snapshot is regenerated.

## Round 1 record

Claude rejected the look; its compact sheet/review now live under
`looks/summit/finish-area/`. Source was `c67db925`. Lane: 70 passed,
1 scene-signature failure, 1 not run; build/browser passed. Replays passed
225 checks and combat fingerprints 12 checks. The native drive completed
all three races but hit the known Glacier Hairpin guard at s=8565.15 m;
Claude assigns that to QA-SUMMIT-GLACIER-EDGE, outside this card.
No first-round scene signature was regenerated. Consumed raw evidence is
recycled; Git retains the detailed old note.

## Changed assertions

`tools/test-track-kits.mjs`: registry count 39 -> 40 and exact appended-ID
list gains `summit-finish`. Both still require exact equality; the original
35 IDs/order assertion stays unchanged. Claude's written review is pending.
No signatures are regenerated.
`tools/test-blender-output.mjs`: add the new recipe and both output paths
to the existing exhaustive coverage table. No assertion expression changes.

## Removed

Replaced the old hut/observatory placements. Existing runtime models and
recipes are reused. Review captures remain only until Claude has judged them.
Round 2 replaces the unsupported parking box and the old capture recipe.
Generated builds and consumed round 1 evidence are recycled; keep the compact
sheets, recipes, current runtime assets and pending round 2 evidence.
