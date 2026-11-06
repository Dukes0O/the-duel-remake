# TOWN-ART-DOME — round 4

## Changed

- Removed the smooth wall strip and its continuous backing; built the exterior from three staggered rows of wreck shells with a photo-projected stacked-car surface behind them.
- Corrected the bus dimensions to 2.5 m wide, 4.4 m tall, and 11 m long, on wheels with the nose facing the road.
- Removed the rectangular dirt apron and replaced the blurry road tile with a 512 px repeating photograph. Added its prompt and credit to the texture credits.
- Narrowed the sign plate, reduced rim scaffold bays, rebuilt `dome.glb` from the recipe, and made the sheet from the exported model re-imported into an empty scene.

## Checks

- Blender recipe/export and three view renders: passed; exported GLB is 2,527,716 bytes.
- `node tools/test-blender-output.mjs`: passed, 251 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed.
- Lane tier and build: not run, as directed for this art lane.
- Browser and in-game look checks: Claude to review.
- Replay fingerprints: not run; no simulation files changed.
- Changed assertions: none.

## Claude look review

Compare the road photo and road render for bus fronts, readable full SCRAPDOME sign, and the dirt road through the opening. Check the outer wall from 40 m and the mayor view for any remaining smooth-looking band, plus Heap footing and the trimmed base. The self-review sheet records that the sign and buses still need visual correction.

## Removed

- Removed the rectangular `banked-dirt-skirt` apron mesh.
- Remove `round-1.jpg`, `round-2.jpg`, `round-1-review.md`, and `round-2-review.md` from this card's look folder.
