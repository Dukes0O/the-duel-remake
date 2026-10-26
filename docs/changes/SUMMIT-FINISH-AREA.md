# SUMMIT-FINISH-AREA

Status: round 1 in progress; stop for Claude's look verdict. Kind: art.
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
