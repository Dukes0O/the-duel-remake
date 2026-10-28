# SIRENA-WRECK-ART

The short board entry controls current state, ownership, dependencies and locks.

THE_DEEP 6.9. The **Sea wreck** finish for the drivable Falcone Sirena
(SIRENA-CAR's model): barnacle clusters, small shells, strands of dried
seaweed hanging from the sills and bumpers, rust bloom and grey-green sea
grime over her faded red, the white stripe and roundel number 7 just showing
through. Gritty and real, never cartoonish. Built as a Blender recipe in
`tools/blender/` (Codex): crust meshes fitted to the car's panels plus a
weathered paint texture, one GLB variant or an overlay set the car loader
adds when the Sea wreck finish is chosen; wheels stay separate and spin.
Budget: the Sirena's triangle cap plus at most 30% for the crust. Look: one
comparison sheet per round (wreck finish beside the restored finish, five
views, plus one in a race) under `docs/board/looks/sirena-wreck/`; Claude
judges against the raised wreck's look so the two read as the same car.

## Round 1 build decision (25 October 2026)

Use a standalone `public/assets/models/sirena/sea-wreck.glb`, adapted from
the existing drivable builder, with its wheel pivot hierarchy preserved.
No garage, save or loader change. LAB-RESTORE-2 owns choosing this variant.
Match the raised wreck's warm rust, surviving dark red and olive sediment;
add hollow barnacle crowns, small shell fans and dried weed at panel edges.
Use embedded weathered paint textures, rather than Blender-only shaders.
Keep crust below 30% of the actual source triangles as well as the card cap.

Checks: rebuild and re-import the GLB in Blender; verify triangle counts,
embedded textures and four independent wheel pivots; review one sheet with
five paired views against the existing raised wreck. Lane tier and build.
No frame check: the finish is not wired into the game yet. An in-race frame
is optional in Kyle's session request; do not label a staged render as a race.
