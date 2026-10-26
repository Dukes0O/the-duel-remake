# SUMMIT-FINISH-AREA

Status: round 1 ready for Claude; further art stopped. Kind: art.
Flag: existing `summit-run`.

## Design before code

Follow the card's hut, observatory, timber gantry, spectators, helipad,
car park and footprints. Reuse the current CC0-derived hut and observatory
and the existing crowd atlas. Keep the actual summit ski/rescue pad at
SUMMIT_PADS.summit; move the hut beside that pad. Keep every Yeti spot.
The extra finish kit is an original Blender assembly of timber, fabric,
paint and snow marks; no new downloaded source or dependency.

Files: Summit's landmark placements, a dedicated finish recipe and model,
finish presentation module, its one circuit-effects hook, and the round 1
capture recipe. No hillside, route, save, helicopter or race-rule edits.

Checks: existing circuit-summit layout/drive check; memory-only round 1
High/Performance finish views; lane tier and build. No frame timing.
The physical run-off beyond the open-road endpoint must be checked explicitly;
an art sheet alone does not prove that acceptance.

## Evidence

Checked source: `c67db925`; the final handoff adds only notes, sheet and
the required STATUS snapshot. No release, merge or push.

Independent code review found floating footprints in the first export.
Corrected by sampling the existing rendered snow in the Blender recipe;
the reviewer confirmed every exported footprint vertex now clears the snow
by 0.005–0.045 m. The kit uses a road-level origin four metres before the
terrain ribbon ends, with the gantry still at the finish itself.
`test-track-kits --validate-circuit src/circuits/summit-run.js` passes all
38 real High/LOD placements and road-clearance checks.

The first browser attempt timed out before producing pictures. The first
lane attempt found the missing Blender recipe registration. Its remaining
arena test was stopped after source changed; that attempt is not a pass.
The recipe is now registered for unchanged output-placement assertions.

Round 1 browser capture passes: 12 native High/Performance views, private
port 45325, memory-only storage, zero warnings/errors. Final comparison sheet
is `docs/board/looks/summit/round-1.jpg` (200,158 bytes). Camera-only corrections
replace the first sheet; there is still only one art round. Claude's verdict
is pending; see its adjacent review note for visible gaps.

Native `drive-through.mjs --course summit-run --json` fails its strict
on-road guard at s=8565.15 m, lateral=6.002 m in Easy/Medium/Hard. All three
complete the native race (280.958/280.983/280.958 s). Ground probe: 106,650
samples, no ground issues. The failure is about 5.65 km before the finish;
no driver, physics, road, Yeti or hillside code changed in this card.
No guard was changed. Drive-through acceptance remains open.

The corrected lane tier hits the unchanged `test-world-composition.mjs`
Summit signature: actual `4919178c3015854b67cee44f440d57c3f5e1319164108003a6e0015f40312909`
versus baseline `717f2986420e2baef7e4bed451925eb6c34a640bfd3d3ffd212f88ac522b2ad4`.
New finish presentation changes geometry/materials as intended. No signature
is regenerated before Claude reviews the visual difference. This gate is
not green. `test-circuit-summit` and Blender output-placement coverage pass.
Final lane result: **70 passed, 1 failed, 1 not run**, 651.57 s, jobs 4.
The exhaustive actual-kit suite passes, including Summit and Time Attack.
`npm run build` passes (1.47 s); only existing chunk-size/dynamic-import
warnings. Both commands ran from PowerShell with System32 first on PATH.
Replay guards pass unchanged: 225 checks across 25 cases/23 events/9
categories, three frame rates and three repeats; combat fingerprints pass
12 checks across four encounters. Independent code review is clear after
the footprint fix. Cockpit sync ran through the protected runner: no changes.

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
Recycled the generated `dist` and QA bundle after use; retain only the compact
sheet, recipes, runtime assets and the pending-review evidence.
