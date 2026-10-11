# P4-PANORAMA: the first full mountain circuit

## Design, before code

Keep the authored road, stable id, widths, crests and lap geometry exact.
Sunset uses race progress: golden through lap one, then a smooth transition
to dusk by the start of the final lap. The light cannot reset at a lap seam.

Use Kyle's approved GLBs: full-span five-lamp gantry at the real line,
open garages and stands along Pit Straight, barrier and marshal detail.
The summit radio mast is a real lattice steel tower with aerials and guy
wires. A lit timing tower shows the actual field; the lower town uses
approved shopfronts, below Skyline. No placeholder landmark substitutes.

Shared loader owns readiness, distant models, private start lamps and
resource cleanup. Only its frozen metadata contract is used here. Generic
circuitLandmarks metadata drives radio/scoreboard geometry; its world hook
waits for the loader source freeze to avoid shared-file conflicts.

Check all eight cars at the grid, ridge, overtaking zones and final-lap dusk;
measure the track's own quiet CPU/GPU/delivered cost with unchanged limits.
Record actual Medium lap and named corner speeds and the section3.2 field
results. Art sheet goes to Claude through the card, up to three rounds.
Claude's finishing pass remains required before any release.

## Checks

All five focused checks pass, including every authored actual High/LOD GLB
placement against rendered ground and native pit clearance. Lighting/PIT/GP
and loader source were genuinely merged; the renderer conflict retains
Team Room snapshot cleanup plus kit retry/disposal. Independent runtime review
is clear. Two prepared-browser issues were corrected before execution:
in-memory Vite helpers replace missing raw module paths, and named captures
follow genuine field progress with actual sampled light metadata.
The real native-start regression first fails (duel instead of Grand Prix), then
passes after adding only Panorama to the closed-road allow-list. All six focused
checks pass; old course ids and rules stay exact. The new fixture initially
required definition object identity; GP intentionally wraps it with grandPrix:true.
It now checks the exact stable id, original script/kit references and GP marker;
no existing assertion or tolerance changed. The private helper also sets
the same QA build flag as the native app, preserving course ownership.
Native High/Performance pass private54308:12 captures, zero warnings/errors.
Actual road/drawn triangle heights and native Ridge chase are checked. Genuine
laps117.483/120.176/98.667s; all8 finish with25 passes. Seed1000 has3+ distinct
first30s crashes; no clean-field/rate pass is claimed. First submitted actual art sheet
is269807bytes; its grounded-camera rebuild replaced the unsubmitted draft.
Quiet frames and field balance remain pending; Claude art/driver decisions wait.

Private QA now waits for the actual native inspection camera before metadata
and pixels. Frame sampling fixes only its presentation camera position to the
authored grid view before the original sampler witness; no racer is moved.
The unchanged sampler/counts/limits remain. No new native/frame run claimed. Independent ec4ef834 camera/limit review clears.
Genuine dcdab76a sync installs consumed-art cleanup; runtime remains exact.

## Round two (Claude check-in 5)

Before code: keep road geometry/rules exact; add shared deterministic hillside
cut/ridge drops/valley to actual ground, near/far meshes and physical verges.
Approved catch fences sit behind original grey collision walls; existing kerbs
stay low. Seeded tree clusters/rocks/scrub use actual upper Float32 triangles.
One camera-floor helper serves chase and Dossier snapshots in both qualities.
The course-only low golden sun and brighter orange/violet dusk preserve default
palettes and light timing. Same native views plus Murray/Esses will go to Claude.
RED mountain bank/light tests failed original source; GREEN9 tests and544 light
checks passed, including actual GLBs/clearance. All native tree roots pass;
camera/dry regressions pass. Quiet native art/frame proof remains due.
No old assertion changed and no world signature regenerated.
The field recipe uses the approved native.95 driver, exact original seeds/targets
and memory-only App. Three isolated30 reports need matching source/seed/index
coverage before combined90 verdict. Frame output labels its hidden mirror/HUD
main-view scope; sampler/counts/limits are unchanged. No rate/frame pass claimed.

## Removed

The road-only presentation is replaced by approved circuit kits and landmarks.
No road geometry, existing mode or real save is removed.
