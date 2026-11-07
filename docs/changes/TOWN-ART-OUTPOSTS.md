# TOWN-ART-OUTPOSTS

## Design

Built the hermit camp from the existing Wasteland town brief. The hut door faces the road at -Z. Its side photo has the front at the right, and the measured endpoint order follows that view. The hut is 6.07 m long, 3.51 m wide and 3.14 m high from its 2 m door. The goat shed is a separate photo-carve. A rusty car bonnet forms the satellite dish. The chair faces out from the hut.

## Changed

- Added the hermit hut, goat shed, bonnet dish, leaning pole and chair under `hermit-camp`, a direct child of `town-outposts`.
- Printed and checked the world bounds for each camp part and the full camp. The 3 by 3 cell footprint remains clear.
- Added a family-root test and a 9,000-triangle hermit-camp budget. The outpost family budget is 30,000 triangles.
- Added the Hermit Camp round 1 sheet and this review note. Kept the diner and school geometry unchanged.

## Checks

- Blender 4.5.13 recipe/export/render: passed. The run printed hut, shed, dish, chair and camp bounds. GLB size: 4,019,808 bytes.
- `tools/test-blender-output.mjs`: pending.
- `tools/test-repo-hygiene.mjs`: pending.
- `tools/test-review-evidence.mjs`: pending.
- Browser checks and frame timing were not run. This is an art-only asset that is not wired into the game. Race fingerprints do not apply.
- Changed assertion: added the requirement that `dot-diner`, `plane-school` and `hermit-camp` are direct children of `town-outposts`; no assertion was weakened.

## Claude should inspect

Check the four hut photo comparisons, the side-to-gable seams, the bonnet dish connection, the chair's direction, and the 88 m mayor view. The sheet records the visible differences.

The art card's 3 MB family-file target is exceeded. The existing diner and school GLB was 2,865,604 bytes before the camp; the required four-view hut and shed textures add about 1.15 MB. The current output remains below the task test's 5 MB family cap. Review whether the town family's target should change or whether a separate texture-budget card is needed. The accepted diner and school were not altered to reduce their textures.

## Removed

- Removed the unsubmitted generic `round-1.jpg` draft and replaced it with `hermit-round-1.jpg`, so the accepted diner round 4 and school round 9 sheets remain intact.
- No runtime code path was removed.
