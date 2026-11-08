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
# Wreck ring, round 19

## Design and change

The wreck-ring wall now uses 42 photo-textured `tyre` pieces: 21 per course, laid flat with the axis vertical. Each tyre has a 16-sided round profile and a worn tread. The two courses are offset and touch around the ring. Their combined wall height is 0.70 m. The square floor and dark square patch are replaced with a circular sand floor inside the wall.

The four photo-carved bumper cars are scaled to about 2 m by 1.3 m with their rubber bumpers. Each has its own named root, `wreck-ring:car-1` through `wreck-ring:car-4`, at a different angle inside the ring. Each has a separate seat, steering wheel and column; the orange shell remains photo-carved from the four retained reference views. The complete family GLB is 4,421,636 bytes; the wreck-ring uses 8,972 triangles against its 9,000 limit. All recipe bounds and contact checks passed.

## Review

The round-19 sheet is 243,716 bytes. It compares one car with the four references and shows the ring from above, the mayor view and both three-quarter views.

Self-review: likeness 3/5; readability 4/5; grounding 4/5; scene consistency 3/5; triangle/file budget passed. Frame cost was not measured because the family is not wired into the game. Five visible differences remain: the photo-carved shell is faceted in the straight views; the steering wheel and seat are still small; tread faces show repeated photo seams; the cars form a tight cluster rather than a clear mid-bump; and the tyre wall reads as stacked sidewall discs from above. Claude should judge the car scale and cockpit details, tyre tread and roundness, and whether the side-height view leaves enough of the cars visible.

- Blender recipe export and footprint/contact checks: passed.
- Imported-GLB renders: completed for matched side, front, rear and above car views, plus two three-quarter, mayor and whole-ring overhead views.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 611 checks; 8 passed, 1 failed. The audio-analysis test could not spawn `ffmpeg` (`EPERM`). The same suite was rerun once with the same result. Its JPG publication checks passed; the final sheet is 243,716 bytes.
- Lane tier and application build: not run, as directed for this art card.
- Browser and in-game look checks: Claude's review; not run here. The family is not wired into the game.
- Changed assertions: none. Race fingerprints: not applicable.

## Removed

- Removed the upright two-course torus wall, oversized shells and square floor patches; replaced them with flat treaded tyres, scaled photo-carved cars and a circular floor.
- Removed `round-18.jpg` and its review note, superseded by the round-19 sheet and verdict request.
