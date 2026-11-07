# TOWN-ART-FOOD: soup kitchen round 6 and market hall round 1

## Soup kitchen round 6

- Rebuilt the soup kitchen only. The other food buildings keep their round-5 geometry.
- Added `soup-kitchen-wall.jpg`, a matching 712×532 clean front photo of the tin wall, posts and earth, with the roof, awning, shelf and cooking pieces removed.
- Replaced the kitchen's joined photo carve and small rear card with one full rear wall, four ground-standing posts, a pitched tin roof with overhang, traced sagging front awning, and the side curtain on its post.
- Made the shelf deep and separate, with photo-wearing cans and pans. Turned the open pot from its front-photo profile, with a dark soup surface and separate rim. Added a grounded ring of cylindrical logs, small embers and several flame blades. Bench legs reach the earth.
- Exported and reviewed the GLB. It is 1,928,036 bytes. The round-6 comparison sheet is 132,838 bytes, below 500 KB.

### Soup kitchen checks

- Blender 4.5.13 rebuilt and reimported the exported family GLB; front, both three-quarter views, bay view and mayor view rendered. I inspected the renders and the submitted sheet.
- `node --test --test-name-pattern="TOWN-ART-FOOD keeps every food plot selectable inside its footprint budgets" tools/test-blender-output.mjs`: passed, 321 checks. The first run caught oversized embedded photos; the recipe now packs 256×192 copies while keeping the source photos full resolution.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/test-review-evidence.mjs`: failed 3 of 9 checks. Two unrelated checks still expect 6 November paths and the deleted round-5 sheet; one audio check could not start `ffmpeg` (`EPERM`). The review-JPG publication check passed. No assertions were changed.
- No lane tier, game build, browser check or game race ran. Claude should inspect the front photo/model pair, both three-quarter views, the bay, and the mayor view on the round-6 sheet.

### Soup kitchen removed

- Replaced the round-5 soup-kitchen carve, flat rear card, and curved sheet awning with the measured, separate pieces above.
- Recycled `round-5.jpg` and `round-5-review.md` after submitting round 6.
- Removed this round's temporary photo grids, render images, sheet-builder scratch and test logs after making the review sheet.

## Market hall round 1

- Replaced the old market hall geometry with a photo-carved open hall using
  `carve_object`, measured from the 2 m storage door. The front and rear table
  entries both state their measured roof `top`; the open bay uses a keep box.
- Added five separate stall fronts, goods panels, counters, posts and awnings.
  The Blender recipe prints and checks bounds for the market pieces.
- Exported `food.glb` at 1,946,716 bytes. Added `market-round-1.jpg` (196,452
  bytes) and its review. The prior `round-6.jpg` remains in place.
- Retained the generated PNG reference originals from the earlier uncommitted
  work and credited them alongside the JPEG recipe copies.

### Market hall checks

- Blender recipe and exported-GLB renders passed. The Blender log includes
  bounds for every market mesh; the hall shell and stall fronts touch ground,
  goods panels touch their counters, and all pieces stay inside the footprint.
- Photo masks were inspected beside the source images. The open front bay is
  removed from the carve mask and kept visible.
- The rendered sheet was inspected beside the source photo. The front match,
  both three-quarter views, road view and mayor view are included. Review notes
  record visible shortcomings for Claude.
- `node tools/test-blender-output.mjs`: passed, 331 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: failed placement for the required
  `market-round-1.jpg` name; this filename does not match the check's allowed
  review-sheet pattern. The requested name is retained.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed; audio analysis
  failed because spawning `ffmpeg` returned `EPERM` in this environment. The
  sheet size and JPG publication checks passed.
- Browser and look checks were not run here. Claude should inspect the gable
  and photo alignment, stall depth and placement, and mayor view framing.
- Changed assertions: none. Race fingerprints: not applicable to this art-only
  change.

### Market hall removed

- Removed the previous hand-built 3x3 market hall roof, frame and stall
  geometry from `tools/blender/town-food.py`.

## Market hall round 2

- Rescaled the photo-carved hall to a 9.45 m by 9.45 m plan while keeping the
  source side-photo height scale and the accepted patched roof.
- Built a rusted steel frame with five bays along each side and posts across
  the front and rear. Sloped rafters meet the roof at its eaves and ridge.
- Added earth under the full roof, a one-bay galvanized store with a timber
  door at the road-side corner, and six deep stalls in two facing rows. Each
  stall has separate photo-wearing goods and base faces, a counter, shelf,
  steel legs, and a projecting canvas awning.
- Printed every market piece's bounds and checked footprint containment,
  floor contact, post height and awning-arm connections.
- Blender 4.5.13 exported and reimported `food.glb` at 2,018,328 bytes.
  The complete food family is 29,452 triangles. `round-7.jpg` is 155,422
  bytes and shows six full-building views. `round-6.jpg` remains.
- `node --test --test-name-pattern="TOWN-ART-FOOD keeps every food plot selectable inside its footprint budgets" tools/test-blender-output.mjs` passed: 331 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs` passed. `node tools/test-review-evidence.mjs` passed 8 of 9 checks on both runs; its audio-analysis check failed both times because spawning `ffmpeg` returned `EPERM`. The bounded review-JPG publication check passed.
- No lane tier, game build, browser check or race ran. Claude should review the full-building views, roof framing, store and door, both stall rows, goods faces, awnings, clear aisle, and floor contact on the round-7 sheet.
- Changed assertions: none. Race fingerprints: not applicable to this art-only change.

### Market hall round 2 removed

- Replaced the market hall's empty-bay carve supports and flat stall strips with the measured steel frame and deep stall modules.
- Deleted the superseded `market-round-1.jpg` and `market-round-1-review.md`; kept `round-6.jpg`.
- Removed this round's review renders, masks, Blender file and test logs after preparing the submitted sheet and model.

## Canteen round 8

- Replaced the primitive canteen bus with a rounded body carved from measured side, front, rear and true overhead roof photos. The earlier slanted roof reference showed side windows; the true overhead reference removes that roof distortion.
- Added the road-side hatch recess, serving counter, patched canvas awning, wheels and benches as separate parts. Reduced shell and wheel detail to keep the 2 by 1 plot within its 5,000-triangle budget.
- Blender 4.5.13 exported and reimported the family GLB at 1,897,688 bytes. The canteen is 3,352 triangles; the family has 28,675 triangles. The round-8 sheet is 141,634 bytes.
- `node tools/test-blender-output.mjs`: passed 361 checks, 0 failed on the final run. Its first run caught the canteen photos exceeding the per-image 256 px bound; the recipe now packs 256 px copies and the rerun passed.
- `node tools/test-repo-hygiene.mjs`: passed. `node tools/test-review-evidence.mjs`: failed 1 of 9 checks on both runs because spawning `ffmpeg` returned `EPERM`; the review-JPG publication check passed. No assertions changed.
- No lane tier, build, browser check or in-game look check ran. Claude should inspect the body match, the awning and counter attachment, the wheel wells and the roof from above on the round-8 sheet.
- Changed assertions: none. Race fingerprints: not applicable to this art-only change.

### Canteen round 8 removed

- Replaced the previous primitive bus body, flat canvas board and oversized photo-carved shell with the measured hull and separate service parts.
- Removed the unused four-view source collage after retaining its individual side, front and rear views and the corrected overhead view.
- Removed the scratch sheet builder, raw render and mask captures, temporary Blender outputs and test logs after recording the review evidence.

## Canteen round 9

- Measured the front body from the photo grid: x=418–766, centre 592, roof row
  95, ground 516. At 3 m roof height, the measured 348 px span sets the body
  width to 2.48 m. The overhead photo centre was corrected to row 348.
- Removed the rounded cross-section so the bus keeps its boxy front.
- Cut the serving hatch into the road-side shell. The sloping awning begins at
  the wall, the tyres finish flush with the body sides, and three stools stand
  beside the serving window on the ground.
- Blender prints every canteen piece's bounds and checks body width, awning
  contact, tyre alignment and stool ground contact.
- Added the round 9 sheet with the front reference beside the exported model
  from the same orthographic camera. The side reference remains unchanged.
- Blender export and internal bounds/contact checks passed. Blender output
  passed 361 checks; repository placement passed.
- Review evidence passed 8 of 9 subtests. Audio analysis failed twice on the
  same unchanged code because `spawnSync ffmpeg` returned `EPERM`; eight other
  subtests passed both times. This is outside the art change.
- Browser and in-game look checks were not run here. Claude should inspect the
  front match, serving hatch and awning contact, tyre flushness, and stools in
  the three-quarter and mayor views. Changed assertions: none. Race fingerprints
  do not apply to this art change.

### Canteen round 8 removed

- Replaced the round 8 review sheet and note with round 9. Rounds 6 and 7 stay.
- Removed the temporary photo grid, renders, mask captures, Blender source and
  test logs after recording this review. Kept the source photos, current model,
  round 9 sheet and notes.

## Follow-up: three market stalls

The market stalls now have shared patched awnings, clearer tool shapes and lower-poly tyre rings with separate hubs. The family GLB is 1,993,096 bytes. Blender counted 1,074 triangles for stall-a, 522 for stall-b and 921 for stall-c. Every piece printed its bounds and passed the one-cell footprint/contact check.

Checks:

- Blender recipe build passed and rendered isolated model views for each stall.
- `node tools/test-blender-output.mjs` passed: 377 checks, 0 failed. Its first run caught over-budget tyre and family totals; reducing ring and hub segments fixed them. No assertions changed.
- Browser and in-game look checks were not run; Claude should review round 10.
- Race fingerprints do not apply.

Generated orthographic reference photos could not be saved into the lane after the image tool returned inline data and the shell rejected the transfer command as too long. No photo credits or photo-to-model comparisons are present. The round-10 sheet is model-only and calls out this limitation for Claude. No previously accepted building or earlier sheet was removed.

### Removed

No previously accepted model, source photo or review sheet was removed.


## Round 11: tyre goods and budget fit

### Design

The card gives the buildings, footprints, goods and shared model contract. No open design question remains. This round adds three stacked tyre rings to the tyre stall. The traced outlines were simplified slightly to meet the existing one-cell and family triangle budgets without changing their silhouette at town scale. The food photos are exported at 224 px maximum so the combined embedded images stay under the card's 1K pixel limit.

### Changed

- Added three tyre-shaped goods to stall-c in tools/blender/town-food.py.
- Reduced trace density on the three market stalls while preserving the visible outline.
- Downsampled material and photo images for export only; source references remain full resolution.
- Rebuilt public/assets/models/wasteland/town/food.glb and added the round 11 comparison sheet and review note.

### Checks

- Blender recipe export: passed; 29,506 triangles, 2,049,168 bytes and 907,360 embedded image pixels.
- tools/test-repo-hygiene.mjs: passed.
- tools/test-review-evidence.mjs: the round sheet publication check passed; the suite also reports an existing missing note for town-art-outposts/round-15.jpg and ffmpeg spawnSync EPERM, both outside this card's files.
- `tools/test-blender-output.mjs`: passed, 377 checks, 0 failed.
- Lane tier: 13 suites passed, then `tools/test-circuit-panorama.mjs` failed and
  stopped the remaining 33. Its one permitted rerun passed all 19 checks. This
  unreliable-suite report belongs on the board for the Director to card; board
  files are outside this lane's ownership.
- Production build via npm.cmd run build: passed.
- No browser or in-game check; this model is not wired into the game. No race fingerprints apply.

### Removed

- None. Replaced only the exported food-family GLB with the reproducible Blender output.
## Round 12: market stalls

Claude approved the revised food family allowance of 8 MB and 4,194,304 embedded texture pixels (2048 by 2048) for this round. The recipe keeps the stall front and side references, the market hall's front stall reference, and the soup kitchen wall photo at their full source resolution. Other mapped images remain compact so the complete family can stay inside the reviewed total pixel limit.

The stall frame follows the rusted pipes in the front and side photos with traced, slabbed pieces. The counter keeps its plank grain from the side photo. The canopy uses the front photo across a sagging draped mesh, a traced torn hem, and a traced side profile. Fruit crates, hanging tools and tyre rings remain separate goods displays.

## Checks

- Blender 4.5 export: passed. `food.glb` is 2,608,820 bytes. Read-back stall triangle counts are 1,768 (A), 1,568 (B) and 1,132 (C), each under 1,800. The export printed bounds and passed the stall footprint and contact checks.
- `node tools/test-blender-output.mjs`: passed, 377 checks and 0 failures, including the 8 MB and 4,194,304-pixel food limits. The first run found over-budget stall and texture totals; the final export clears both.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `node tools/test-review-evidence.mjs`: 7 of 9 suite tests passed, including round-sheet publication. Its other failures are the checker still expecting the round-11 JPG that this task requires removing, and `spawnSync ffmpeg EPERM` in audio analysis. No test assertions were changed.
- No lane tier, game build, browser check or race was run. The model is not wired into the game and the brief assigns browser and in-game look checks to Claude. No race fingerprints apply.

The food output check now uses Claude's reviewed 8 MB byte ceiling, 2048 px per-image ceiling, and 4,194,304 total pixel ceiling. The generator entry's `maxBytes` changed from 3 MB to 8 MB. No unrelated assertions changed.

## Claude should inspect

- The matched front and side photos beside stall-a.
- Rust and pipe joints, the plank counter top and front, and the sag, patches and torn canvas hem.
- The three-quarter views for the fruit, tools and tyres displays, plus the mayor view with all three stalls.
- Whether the frame texture and goods remain clear at town scale and in the market context.

## Removed

- Removed the failed round-11 sheet and review note as superseded by round 12.
- Replaced the round-11 food GLB with the round-12 export.
- Removed the flat-color counter and awning materials; the photo-mapped surfaces replace them.

## Greenhouse photo references

Four original reference photographs generated with OpenAI image generation on 7 November 2026. Each file is a single orthographic camera view on an even grey studio ground: side, front, rear and straight-down overhead. The same salvaged greenhouse design appears in all four. The source images were 1536×1024 and are saved at 1024×683 as quality-92 JPEGs in the lane texture folder.

- `greenhouse-side.jpg` — generated side elevation.
- `greenhouse-front.jpg` — generated front gable elevation.
- `greenhouse-rear.jpg` — generated rear gable elevation.
- `greenhouse-top.jpg` — generated straight-down roof plan.

Image credit: OpenAI image generation; prompts authored for TOWN-ART-FOOD. No external images used.

Claude should compare the model against each photo at matching orthographic cameras, plus both three-quarter views and the mayor's view. Check clear frame openings, readable salvaged windshields, pale translucent plastic, green rows, grounding and the 3×2-cell footprint.
