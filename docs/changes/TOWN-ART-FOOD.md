# TOWN-ART-FOOD round 5

## Changed

- Opened the soup-kitchen bay, reversed the front-photo projection, and kept its photo-backed tin, shelf, cans and pans on a rear wall. Added separate posts, benches, a curved awning, a photo-profiled pot, stones and the small emissive fire.
- Added the bus driver's windscreen, destination board, grille, lamps and four low-poly mounted wheels to the canteen.
- Changed stall-a's fruit awning to a curved sheet and added produce sacks.
- Made shopfront-a's FOOD sign a separate thin slab with larger front-facing lettering.
- Added two sagged canvas roof patches to the open market hall and a curved salvaged windscreen to the greenhouse.
- The family GLB is 1,782,476 bytes, below the 8 MB round-5 limit. The review sheet is 188,564 bytes, below 500 KB.

The requested `docs/ART_LINE.md`, `tools/blender/photo_carve.py`, and `tools/photo_grid.py` are absent in this lane. I used the available `tools/blender/photo_model.py` and `hull_model.py`; the later five buildings use their existing recipe shapes because no measured photos for them are present in the family texture folder. Claude should decide whether those five need a further photo-based round.

## Checks

- Blender 4.5.13 rebuilt and reimported the exported GLB; five review views rendered.
- `node tools/test-blender-output.mjs`: passed, 305 checks, 0 failures. The first run found the canteen at 6,017 triangles against its 5,000 plot limit. Removed redundant spare tires and reduced mounted-wheel segments; the rebuilt model passed.
- `node tools/test-repo-hygiene.mjs`: passed. Its output lists advisory size targets only; no placement failure.
- No lane tier or build was run, as directed for art cards. No browser check was run. Claude should inspect the submitted sheet and the named building views at driver and mayor heights.

## Changed assertions

None.

## Race fingerprints

None. This art-only change does not touch simulation code.

## Removed

- Removed the round-4 sheet and review note after replacing them with round 5.
- Removed the four mounted-as-spares tire meshes from the canteen; the bus now has four fitted wheels.
- Removed this round's temporary renders and test logs after making the review sheet.
