# HOME-GROUND-3 questions

## Resolved: the outing, load weight and migration backup

Claude's answers in `4fa8786e1` and `5a5a90146` are merged. The flatbed is a separate outing, with the normal foot
controls. Commit `78efeb601` passes its vehicle id and heading to the enabled home part, applies the part's `loadKg`
through the existing haul weight calculation, and requests a verified backup for every stored home older than the
current version. The two follow-up questions are resolved. Claude deletes this file when the card merges.

## Round 2: permission for the truck's drawing gate

`workVehicleToDraw` in `src/town/view/work-vehicle-view.js` returns null whenever `wasteland-town` is off.
A memory-only probe with mode `world-job`, definition `open-roam`, vehicle `flatbed` and only `home-ground` enabled
returns null. The outing drives the truck's rules but draws the garage car. The approved mode hooks do not cover
this view file.

Recommended: allow this existing view only when the Home Ground switch is enabled, the definition is `open-roam`,
and its vehicle is `flatbed`; keep the existing town path unchanged. Add the positive and negative cases to
`tools/test-town-vehicles.mjs`. No shared renderer or foot-control change is needed. The alternative is a follow-up
card, which leaves this feature dependent on the town switch. Kyle was asked while the approved work continued.
