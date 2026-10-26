# SUMMIT-FINISH-AREA

Status: round 3 sheet ready; stopped for Claude's final verdict. Kind: art.
Flag: existing `summit-run`.

## Round 3 design, before code

Merged integration as `7e1da271`: no code conflicts; retained this lane's
STATUS and Claude's current card. Make only the five fixes in his round 2
verdict. The working pad is now explicitly settled: keep it where it is.

1. The at-line context camera sits 5 m before the gantry, at car-eye height,
   with a wider lens so the beam is overhead and the run-off is ahead. The
   other four poses stay exact. Record the true camera coordinates.
2. Reuse the crowd atlas, including its raised-arm figures, with standing
   leg proportions. Move the fence/people closer to the road without entering
   it; keep twelve people across the last 200 m.
3. Use the existing terrain snow shader on the packed parking surface. Add
   low edge banks, two existing traffic sedans at the sides, and a lamp post;
   leave the central stopping corridor clear. Do not change the terrace grade.
4. Double SUMMIT type size and fit its backing board/banner around it.
5. Replace flat pad paint with a clear dark H circle fitted to the actual
   rendered snow, ground its existing windsock and add a short marker-post
   path toward the established pad. Do not move any landing/flight rule.

Checks: actual kit clearance, existing finish-ground check, fresh native
drive-through, explicit unchanged scene-signature guard (report old/new),
lane tier and build. Same twenty dusk/night High/Performance pictures.
No frame timing, baseline regeneration, extra art round or other changes.

## Round 3 evidence

Source `50900d56`; sheet `docs/board/looks/summit-finish/round-3.jpg`
is 419,247 bytes, 1945 by 1550. Twenty native High/Performance dusk/night
captures pass on private port 27612, memory-only storage, zero errors or
warnings. At-line context is explicitly 5 m before the gantry with a
105-degree vertical lens; the other four poses are unchanged. This is the
third and final round. No more art runs before Claude's verdict.

Actual High/LOD clearance passes for 38 kit placements. The focused ground
check passes: 27 level terrace vertices, 205,982 unchanged outside vertices,
36 matching native queries and landmark sizes/placements. Independent code
review is clear. No test assertion changes in round 3; no signatures updated.

The unchanged `test-world-composition` guard fails on the expected added
finish scenery. Claude must review this complete-scene difference:

- Old: `fa6b9ba2c655f68845d50ed7ca71691043ba1106704cf958ba5cc76477c04872`
- New: `b9d81ca4e0f181353bb8a38b555e4f1f2ee951ac17b6159f541b341298875ec5`
- Nodes 666 -> 772, meshes 641 -> 716, geometries 112 -> 192,
  materials 61 -> 101, textures 19 -> 20; instances stay 21,121.

Fresh native drive-through on `50900d56`: all Easy/Medium/Hard races finish
(280.958 / 280.983 / 280.958 s), but the check fails at the same known
Glacier Hairpin off-road guard: s=8565.15 m, lateral=6.002 m. This is
`QA-SUMMIT-GLACIER-EDGE`, assigned by Claude outside this finish-area card.
Ground has zero issues across 106,650 road samples. No driver, assertion,
tolerance, replay or flight/landing rule is changed.

Raw pictures, camera facts, browser report and check logs remain under
`.evidence/2026-10-26/SUMMIT-FINISH-AREA/` pending Claude's verdict.

Required lane gate on `50900d56`: **12 passed, 1 failed, 73 not run**,
657.93 s, jobs 4. `test-blender-output` timed out starting Python's
Blender-free output plan; no assertion or timeout is changed. The one-minute
shared-job recheck found four roots: our gate 14156 started 10:07:53, before
gate 3004 at 10:08:02 and browser 40740 at 10:08:06. We started no further
heavy work while over capacity and let our older gate drain. Smoke 632/632
and arena shove 133/133 pass. The early timeout leaves later suites unrun;
the separate scene-signature failure above is an explicit card check.
`npm run build` passes (2.11 s), with existing chunk/dynamic-import warnings.
Both mandated commands ran in PowerShell with System32 first on PATH.
The single allowed `test-blender-output` rerun, started at zero shared heavy
jobs on the same source, passes **89 checks, 0 failed**. No further gate
rerun: the original lane remains incomplete, not a claimed green pass.
Final board check passes 192 checks; repository placement passes after
moving the sheets into one family folder, with no test changes. Cockpit
sync records the parent task In Review. Raw round 3 evidence stays for Claude.

## Round 2 design, before code

Merged current integration as `961b95da`, including Summit's continuous
ground. No code conflict; kept this lane's STATUS as Kyle instructed.
After the release pause, merged integration again as `8306db7e`; the only
conflict was STATUS, resolved with this lane's copy. This brings in the
updated terrain/map checks and helicopter return-load release. The first
round 2 gate was interrupted for that release and is not a pass.
Separate finish sheets now live in `looks/summit-finish/` because the
ground-gap card already uses `looks/summit/round-1.jpg`. Final document
checks caught the round 2 nested folder as invalid: moved all three compact
sheets and their notes into this single family folder. The placement guard
is unchanged; no picture is regenerated.

Follow Claude's round 1 verdict: hut 14 × 12 m, dome 14.4 m across, centres
17 m either side of the road and 16 m before the line. Add warm glazing,
SUMMIT lettering, gantry light and two fence lights. Turn twelve reused crowd
figures toward approaching cars. Grade only the finish terrace into the
continuous backing; the far-grid renderer and height reader share the grade.
No road/physics/Yeti placement or ski/rescue rule changes.

Moving the hut to the line separates it from the operational ski pad.
Round 2 preserved that working pad and linked its yard with a packed path.
Claude's round 2 verdict settled the question: keep the operational pad there.

Checks: focused `test-summit-finish-area` for actual level ground, native
height-query agreement, unchanged surrounding mountain and landmark sizes;
real High/LOD kit clearance; requested lane tier and build. Pictures: car
100 m/30 m before line, at line, helipad and wide; High/Performance, dusk/night.
Stop after the round 2 sheet. No frame timing or signature regeneration.

## Round 2 evidence

The 354,886-byte sheet is at
`docs/board/looks/summit-finish/round-2.jpg`: five requested views,
High/Performance, dusk/night. Twenty captures on private port 19038,
memory-only storage, zero errors/warnings. Captured source `b5c04d78`;
the later merge changes no finish-scene code or model, so the captures stand.
`tools/scenarios/summit-finish-area.mjs` records exact camera poses and verifies
race/profile/storage are unchanged. Claude judged this close and requested
the five final fixes listed above.

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
`looks/summit-finish/`. Source was `c67db925`. Lane: 70 passed,
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
sheets, recipes and current runtime assets.
Round 3 replaces seated crowd proportions, the grey parking material,
old smaller lettering and flat model pad markings. Those old paths are
removed in the same change. Consumed round 2 raw evidence and generated
build output are recycled; retain round 3 raw evidence for Claude.
