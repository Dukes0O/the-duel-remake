# TOWN-ART-FUN follow-up: statue round 17

## Design and change

The statue figure and plinth now use two `carve_object` calls. The figure is carved with `round: 2`, an `ends_split` at its middle, and `front_favour` and `rear_favour` set to 3. Its keep mask starts at the measured plinth top. The separate plinth carve has no round option and retains its square sides. The blank plaque remains a separate piece.

The imported model has 1,462 triangles against the 1,800 limit. Figure, plinth and plaque pass the recipe's footprint and contact guards. Blender 4.5.13 exported the family GLB (4,290,288 bytes) and rendered the imported statue from side, front, rear, above, both three-quarter angles and the mayor view.

## Review

The straight views show one statue. Three-quarter A reads as one face and one raised arm; three-quarter B still reads as overlapping face profiles. The sheet includes both angles so Claude can judge the remaining doubled-profile issue and whether the round figure carve improved it. Claude should inspect the three-quarter views, especially B, and the raised arm at town distance.

- Blender recipe export and its built-in footprint, contact and triangle guards: passed.
- Imported-GLB statue renders: completed for seven views.
- Lane tier and application build: not run, as directed for this art card.
- Browser checks: Claude's visual review only; no browser run by this job.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

- Removed the round-16 sheet as requested. No round-16 review note existed in the looks folder.
- Removed round-16's combined figure-plinth carve and its temporary normal-weight override; replaced them with separate figure and square-plinth carves.
