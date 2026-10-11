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

Implementation and native checks pending. No frame/field/art pass claimed.

## Removed

The road-only presentation is replaced by approved circuit kits and landmarks.
No road geometry, existing mode or real save is removed.
