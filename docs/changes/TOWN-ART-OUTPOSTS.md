# TOWN-ART-OUTPOSTS

## Design

Built the hermit camp from the Wasteland town brief. The hut door faces the road at -Z. Its measured side view puts the front at the right. The hut is 6.07 m long, 3.51 m wide and 3.14 m high, scaled from its 2 m door. The goat shed is a separate carve. A rusty bonnet makes the satellite dish; the chair faces out from the hut.

## Changed

- Added the hut, shed, dish, leaning pole and chair under `hermit-camp`, a direct child of `town-outposts`.
- Printed and checked the world bounds of each camp piece. The full camp stays within its 3 by 3 cell footprint.
- Added a 9,000-triangle hermit-camp budget. The family budget is 30,000 triangles.
- Round 2 reduces only the new camp's photo textures to 192 px and its hut and shed mesh targets to 1,000 and 300 triangles. The diner and school are unchanged.
- Added Hermit Camp round 1 and round 2 sheets and review notes.

## Checks

- Blender 4.5.13 recipe, GLB export, import and seven renders: passed. Round 2 GLB: 2,998,708 bytes.
- `tools/test-blender-output.mjs`: passed, 321 checks.
- `tools/test-repo-hygiene.mjs`: failed only on the required `hermit-round-1.jpg` and `hermit-round-2.jpg` names; its allow-list accepts `round-N.jpg` but not this card's building-prefixed names. The hygiene test is outside this card's owned files, so it was not changed.
- `tools/test-review-evidence.mjs`: 8 of 9 checks passed on the first run and same-commit rerun. Both runs failed only on `spawnSync ffmpeg EPERM` in unrelated audio analysis. No assertions changed.
- Browser checks and frame timing were not run. This art is not wired into the game. Race fingerprints do not apply.
- Changed assertion: lowered the family GLB cap from 5,000,000 to the card's 3,000,000 bytes. This makes the test enforce the existing limit; no assertion was weakened.

## Claude should inspect

Compare all four hut views against their photos. Check the roof-to-wall seams, bonnet dish and pole from the road, the chair's direction, and the 88 m mayor view. The round 2 sheet shows the exported GLB imported into a fresh scene.

## Removed

- Removed the unsubmitted generic `round-1.jpg` draft and named the Hermit Camp sheet `hermit-round-1.jpg`; kept the accepted diner round 4 and school round 9 sheets.
- Moved this task's raw Blender renders, masks, logs, temporary sheet script and generated Blend file to the Recycle Bin after review. Kept only the two review sheets, their notes and the family GLB.
- No runtime code path was removed.
