# TOWN-ART-OUTPOSTS

Status: deck-town round 12 model and review sheet prepared for Claude.

## Changed

Replaced the round-11 box-built deck town with a photo-carved ship deck and a photo-carved tin home copied four times with slight rotations and scale changes. Kept the walkways, ladders, washing lines and named `deck-town:bell`; removed the two support sticks below the deck. Added separate single-view deck and home source photos with credits. Added the four-panel image fault to `docs/ART_LINE.md`. Brightened the review lights and widened the mayor camera so the whole town is visible.

## Checks and review

- Blender 4.5.13 exported and rendered the family; GLB is 4,750,360 bytes. Deck bounds remain within the 4 by 4 footprint.
- The round-12 sheet is 306,868 bytes. It contains matched deck and home photo comparisons, road and far three-quarter views, and the mayor view.
- The model still shows pale bands along the deck sides in the renders. The source front/rear reference transitions and carved surfaces need Claude's visual judgment; this sheet records the result as built.
- `tools/test-blender-output.mjs` was started but stopped after it produced no output for over two minutes; it exercises many unrelated Blender generators. No result is claimed for that suite.
- No lane tier or build was run, as directed. Race fingerprints: not applicable. No assertions changed.
- Claude should inspect the eight source views, deck and home masks, the pale side bands, the ladders and walkways meeting the homes, the bell, and the full sheet. Browser and game look checks remain Claude's.

## Removed

Deleted the rejected `round-11.jpg` and `round-11-review.md`. Rounds 4, 9 and 10 remain. The box-built round-11 model was replaced in `outposts.glb`.
