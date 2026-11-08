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
# Wreck ring, round 18

**Candidate for Claude's review.** The family GLB now contains a 3 by 3 `wreck-ring`: a pair of overlapping stacked tyre courses, a dusty floor, and four individually named `wreck-ring:car-1` through `wreck-ring:car-4` roots. Each car uses a `carve_object` shell made from four generated views and a separate rubber bumper ring. The roots face four different directions.

The side, front, rear and overhead shell photos were generated one view at a time with the built-in image generator and saved as JPGs in the town texture folder. The original generated PNGs remain at the tool's generated-images location. These are generated concept-photo references, not photos of a real make or model.

The final Blender export is 4,199,208 bytes and the wreck-ring contributes 8,496 triangles against its 9,000 limit. The recipe printed bounds and contact results for each piece. Every part fits within the footprint and touches the ground or another piece. Each shell, floor and lower tyre row reaches the ground; the upper tyre row overlaps the lower row; bumpers overlap their shells. The side grid measured the shell span at about x=20 to 1003 pixels and ground at y=454 px; these values inform the side carve. Front/rear height and overhead length scales are estimated from their generated views and remain review points.

## Visual review

The exported GLB was imported into an empty Blender scene and rendered from side, front, rear, above, both three-quarter angles and the mayor view. The comparison sheet is `round-18.jpg` (238,417 bytes). The orthographic elevation views mostly show the tyre wall, as expected for a closed enclosure; the mayor and three-quarter views show all four cars and the ring. The overhead photo-to-model comparison shows the dusty arena and four separate shells. The floor reads as two visibly different dust patches. The cars are recognizable from above and the road-side silhouette is dominated by the tall wall. Claude should review the wall's continuity and height, shell likeness and visibility of all four cars at driver distance.

## Checks

- Blender recipe export and piece bounds/contact checks: passed.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures. Its first run found 14,880 triangles versus the 9,000 budget; wall torus resolution and shell carve grain were reduced before the passing rerun.
- Lane tier and application build: not run, as directed for this art card.
- Browser and game look checks: for Claude; the family is not wired into the game.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

- Replaced the placeholder hand-built bumper cars in the `wreck-ring` block with four photo-carved shells, separate bumper rings, and the stacked tyre enclosure. Earlier accepted buildings and round sheets remain unchanged.
