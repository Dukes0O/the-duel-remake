# WW-ART-SHIPS

Status: incomplete; round 6 of the Patience is committed for review, but it does
not meet the ship realism target. The Good Hope, Marigold, lighthouse and pilot
boat remain unbuilt because Patience did not pass the photo comparison.

## Changes

- Reworked the existing recipe's Patience hull into a dense, flared profile
  with a rounded bilge and full keel; kept the photo projection on the hull.
- Simplified the deck to one walkable deck and raised forecastle, retaining the
  chart room, ladder, mast platform, bell, anchor chains and bow name.
- Made the photo projection hull-specific and removed overlay plates that
  covered the hull curvature.
- Corrected the sand mound's up axis and replaced the oval with a low irregular
  heap that fades into the bed.
- Added the projection crop credit. The GLB contains the Patience candidate
  only; it is not a finished family asset.
- Round 4 raises the ship root so the deck is at y=11, sets the hull to 72 by
  12 m, raises the bow sheer, adds a 4 degree heel and a stern rail, and moves
  the Patience's mast platform to y=25. The GLB still contains the Patience only.
- Round 5 projects the photo over the curved lower hull and cabin sides, narrows
  the bow stations, adds the aft rail, replaces the mast lattice with a stout
  spar, kingposts, derricks, ladder and platform, and corrects the review car
  to 4.5 m. The GLB still contains the Patience only.
- Round 6 narrows the bow texture projection, puts the deck fittings on physical
  two metre UVs, and gives the ground drifts a darker salt-bed color. The GLB
  still contains the Patience only; the Good Hope, Marigold, lighthouse and
  pilot boat were not built because she did not pass the look target.

## Checks and review

- Blender 4.5.13 LTS: exported GLB, cleared the authored scene, reimported the
  exported GLB, and rendered the review views. Round 6 rendered successfully.
- Round 6 GLB read-back: 17,284 triangles and 1,718,852 bytes, within the
  50,000 triangle and 3 MB limits. Maximum metallic factor: 0.28. Review-car
  bounds: 4.50 x 2.02 x 1.01 m.
- `tools/test-blender-output.mjs`: passed, 254 checks; exit 0.
- `tools/test-repo-hygiene.mjs`: passed; exit 0. Size targets are advisory.
- Lane tier and build: not run, per the art card.
- Browser check: not run; Claude handles browser and look checks.
- Changed assertions: none.
- Race fingerprints: none; this is art-only work.
- Look check: failed self-review. The ship still reads as a projected photo on
  a simple form; the blocky cabin and flat ground do not pass. Claude should
  review `round-6.jpg`, especially the three-quarter bow and on-deck views.

## Removed

- Removed the oversize floating hull overlays that obscured the hull's curve.
- Removed superseded round 1 sheet and scratch renders; retained only the last
  sheet, its review note, source recipe and final candidate model.
- Moved round 2 through round 5 look sheets and their review notes to the
  Recycle Bin; round 6 is the only retained sheet and review note.
- Removed this run's temporary round 4, 5 and 6 render inputs, composition
  attempt and logs from `.qa-dist/`. Kept the named `.qa-dist/task.md` brief.

## Round 7 ? Patience upperworks (7 November 2026)

- Added four cropped, credited studio views for the same accommodation block. `photo_grid.py` grids supplied the side ends and deck line (x=40/710, y=460), front and rear centre/deck/roof (x=384, y=460, y=163/174), plan bow/stern (x=145/675), centre (y=245) and bridge-wing span (y=54..436). The plan crop is mirrored to follow the required front-at-minus-Z convention. Constants and measured window/door rectangles are at the top of `tools/blender/scablands-ships.py`.
- Replaced the stacked Patience box tiers with one `carve_object('ship-patience:upperworks', ...)` at 23 m long and 8.4 m high, with a measured maximum 12 m bridge-wing span and 0.30 m recess pockets. The carved Blender bounds read 12.50 x 23.49 x 8.40 m including voxel margins. The 9.3 m deck width is the target for the lower deck-house silhouette; the photo-derived overall bound includes bridge wings.
- Exported GLB read-back: 29,788 triangles and 1,702,368 bytes (1.63 MiB).
- `tools/test-blender-output.mjs`: passed, 381 checks; exit 0.
- `tools/test-repo-hygiene.mjs`: passed; exit 0. Size targets are advisory.
- `tools/test-review-evidence.mjs`: 7/9 subtests passed; two runs both failed the same two checks. One still sees the deleted round 6 sheet through the unchanged Git index because the lane cannot stage or commit here; the other cannot spawn `ffmpeg` (`EPERM`). The JPG bound and review-note subtest passed.
- Browser checks: none; Claude should inspect `docs/board/looks/ww-art-ships/round-7.jpg`, especially the bridge-front and deck-height panels.
- Changed assertions: added a GLB check for the single named Patience upperworks node and absence of the four former tier names. No existing assertion was changed or weakened.
- Race fingerprints: none; art only.
- Self-look: the deck-height view shows the bridge window row, steel doors and portholes, with the usual deck equipment crossing the foreground.

## Removed

- Removed the four `photo_box` cabin tiers, their separate chart-room door, balcony rails/posts, stair treads and stair handrails, and the duplicate generic Patience chart-room boxes/roof/windows/door. The ship's hull, deck, main rails, mast and derricks remain.
- Removed the now-unused `patience-white-painted-steel.jpg` tile and its credit entry; the carved photo set supplies the superstructure finish.
- Removed the superseded round 6 look sheet and review note; round 7 is the single retained sheet.

## Round 8 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Patience upperworks (7 November 2026)

- Re-measured the side and bow photos at 0.0244 m/px. The side grid's 680 px
  span gives 16.59 m; the front grid gives 10.00 m walls, 14.03 m wings and
  7.81 m to the bridge roof. These agree with Claude's 16.6/10.0/14.0/7.8 m
  values. The rear grid uses its own 346 px roof-to-ground span for 7.8 m;
  the plan grid's 530 px length and about 382 px wing span set its own axes.
- Set the cabin aft edge at x = -37 in the ship root and turned its photo front
  toward +X. Recomputed the window, door and porthole recesses from the updated
  side, front and rear photo scales. The upper bridge deck and its window row
  are now included.
- Added `ship-patience:funnel` with the measured side-photo crop and three
  lathed exhausts, and `ship-patience:bridge-mast` as a separately traced slab
  with open lattice cells. The existing main mast, hull, rails and derricks
  were not changed.
- Applied the hull's rusted deck material across the weather deck, raised the
  deck plate slightly to cover the grey hull top, and kept the existing hatches.
  The accommodation roof also uses the rust deck finish.
- Moved the deck camera to the deck at eye height, 15 m forward of the bridge
  front. The lower bridge is visible, but a large dark foreground hull wedge
  remains. The review ground is now a solid volume; a second dark hull shape
  remains visible below the sand line in the side views.
- Exported GLB read-back: 30,708 triangles and 1,774,544 bytes (1.69 MiB),
  within the 50,000 triangle and 3 MB limits.
- Sheet: `docs/board/looks/ww-art-ships/round-8.jpg`, 1600 x 1750, 223,974
  bytes. Honest scores and remaining look failures are in `round-8-review.md`.
- `tools/test-blender-output.mjs`: passed, 381 checks; exit 0.
  `tools/test-repo-hygiene.mjs`: passed; exit 0. Browser and look checks: Claude
  should inspect the full
  sheet, especially the side-view sand line, the deck-height wedge and the
  bridge-front comparison. Review evidence test: Claude runs it at merge.
- Changed assertions: added checks for the distinct bridge mast and funnel GLB
  parts. No existing assertion was changed or weakened.
- Race fingerprints: none; art only.

## Removed

- Removed `round-7.jpg` and `round-7-review.md`; round 8 is the current look
  sheet and review.
- Removed this round's generated renders, Blender review file and scratch logs
  from `.qa-dist/`; kept the named task brief.

## Round 9 ? Patience review views, funnel and bridge wings (7 November 2026)

- Changed the whole and dusk review cameras to perspective, at car height and 40 m off the hull side, aimed at the ship's middle. Kept the overhead and photo comparison views orthographic. Set the deck camera to perspective at eye height and moved it sideways across the deck to improve the bridge sightline. Replaced the thick review cube with a plane at y = -2.
- Rebuilt the Patience funnel as a tapered rounded rectangular stack, about 2.6 by 2.0 m in plan and 3 m tall, mapping its full crop from base to crown. Added three bent dark metal outlets. The bridge-wing side faces use the cabin side photo and undersides use painted steel.
- Exported GLB read-back: 30,402 triangles and 1,816,060 bytes, within the 50,000 triangle and 3 MB limits.
- Sheet: `docs/board/looks/ww-art-ships/round-9.jpg`, 1600 x 1750, 241,674 bytes. Scores and limits are in `round-9-review.md`.
- `tools/test-blender-output.mjs`: passed, 381 checks; exit 0. `tools/test-repo-hygiene.mjs`: passed; exit 0. `tools/test-review-evidence.mjs`: not run; Claude runs it at merge. Browser checks: not run; Claude handles them.
- Changed assertions: none. Race fingerprints: none; art only.
- Self-look: the hull is grounded and reads as a ship at 40 m. The bridge crops near the side-view frame edge, and the deck mast still overlaps part of the accommodation. Close detail of the funnel and bridge wings needs Claude's inspection.

## Removed

- Removed `round-8.jpg` and `round-8-review.md`; round 9 is the current look sheet and review.
- Removed this round's generated renders, Blender review file and scratch logs from `.qa-dist/`; kept the named task brief.

## Round 10 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Patience drift and review views (7 November 2026)

- Added `ship-patience:drifts` as a separate mesh using the existing lake-bed
  sand material. It runs along both hull sides, overlaps the plating, rises to
  an uneven crest and feathers about 8 m into the bed. Port and bow are higher.
- Changed the exported-model review to six perspective views: abeam at car
  height with the whole ship, bow quarter, dusk, overhead, deck, and funnel.
  The deck camera clears the main mast but still sees a cabin side rather than
  the bridge front. The bow-quarter view shows loose chain details; see the
  review sheet.
- Exported GLB read-back: 31,410 triangles and 1,887,128 bytes, within the
  50,000 triangle and 3 MB limits.
- Sheet: `docs/board/looks/ww-art-ships/round-10.jpg`, 1600 x 1800,
  156,439 bytes. Scores and the remaining failures are in `round-10-review.md`.
- `tools/test-blender-output.mjs`: passed, 381 checks; exit 0 on rerun.
  The first run caught my incorrect expected node suffix; I corrected that
  assertion to match the exported `ship-patience:drifts` name. No existing
  assertion changed or weakened. `tools/test-repo-hygiene.mjs`: passed; exit 0.
  `tools/test-review-evidence.mjs`: not run; Claude runs it at merge. Browser
  checks: Claude handles them.
- Changed assertions: added a check for the separate named Patience drift
  part. No existing assertion changed or weakened. Race fingerprints: none;
  art only.
- Self-look: the ship reads clearly from the side, with the whole bridge and
  mast in frame. The deck view misses the bridge front, and the sand bank does
  not yet convincingly bury the hull.

## Removed

- Removed `round-9.jpg` and `round-9-review.md`; round 10 is the current sheet.
- Removed this round's renders, Blender review file and logs from `.qa-dist/`;
  kept the task brief.

## Round 11 - Patience hull, name and sand (7 November 2026)

- Replaced Patience's projected-photo hull with one four-view `carve_object` hull using the measured side, bow, stern and top references. Set the keel at y=-4 m and the walkable deck at y=4 m; the rounded, flared hull remains centred at its prior map location, with its bow toward +X. Moved the deck hardware and main mast assembly down with the deck. Both anchor-chain sides now include a hawsepipe and links.
- Painted PATIENCE on both bow sides and checked renders from each side; both read left to right. Rebuilt the two banks as a smooth, irregular sand height-field that meets the hull and fades into the bed.
- Exported GLB read-back: 48,918 triangles and 2,652,332 bytes (2.53 MiB), within the 50,000 triangle and 3 MB limits.
- Sheet: `docs/board/looks/ww-art-ships/round-11.jpg`, 1600 x 1800, 165,085 bytes. Scores and honest limits are in `round-11-review.md`.
- `tools/test-blender-output.mjs`: passed, 381 checks; exit 0. `tools/test-repo-hygiene.mjs`: passed; exit 0. Size targets are advisory. Browser and look checks: Claude should inspect the sheet; browser checks are not applicable to this art-only lane. `tools/test-review-evidence.mjs` was not run; Claude runs it at merge. The deck and funnel close views were rendered from the exported GLB in an empty scene.
- Changed assertions: added a GLB check for the named Patience hull. No existing assertion was changed or weakened. Race fingerprints: none; art only.

## Removed

- Removed Patience's former `photo_hull` call and the obsolete `patience-hull-projection.jpg` texture and credit entry. The shared `photo_hull` helper remains for the other ships and pilot boat.
- Removed `round-10.jpg` and `round-10-review.md`; round 11 is the current sheet and review.
- Removed this round's temporary renders, Blender review file and logs from `.qa-dist/`; retained the supplied task briefs.

## Round 12 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Patience funnel, cabins and drifts (7 November 2026)

- Added three measured, dead-on funnel reference photos and replaced the box shell and separate pipes with one oval `carve_object` named `ship-patience:funnel`. The old funnel crop is removed. Reduced only the accommodation carve target to keep the hull untouched and stay within the triangle budget.
- Added a material multiply darkening and a broken, vertically stretched oxide streak layer over all four accommodation photos. The existing photos remain unchanged; the hull is unchanged.
- Rebuilt the two-sided drift with seeded phase shifts across four wavelengths. Port is wider and higher, the bow bank rises, and the stern tapers. The inner row overlaps the hull; the outer row sits at y=-2 and shares the bed's sand material. Looked at the exported model from above and car height.
- Set view (e) at deck eye height, 15 m ahead of the bridge face, looking level aft at 35 mm; set view (f) at deck eye height, 15 m aft of the funnel, framing the whole stack and roof at 35 mm. Both views were rendered and inspected from the exported GLB.
- Final GLB read-back: 49,648 triangles and 2,853,084 bytes, within the 50,000 triangle and 3 MB limits.
- Sheet: `docs/board/looks/ww-art-ships/round-12.jpg`, 1600 x 1800, 164,531 bytes. Scores and limits are in `round-12-review.md`.
- `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; existing size targets remain advisory. `tools/test-review-evidence.mjs` was not run; Claude runs it at merge. Browser checks are not applicable to this art-only lane.
- Changed assertion: updated the funnel node check from the retired merged shell name to the requested single carved `ship-patience:funnel` name. This keeps the exact part check and does not loosen it. The hull was given its own named GLB part to satisfy the existing hull assertion. Race fingerprints: none; art only.
- Self-look: the hull and funnel read as a rusted freighter. The six views show the ship small in the whole-ship panels; the cabins remain paler than the hull, and I am not convinced the whole scene reads as thirty years stranded. Claude should review the cabin tone, drift shape from above and funnel profile.

## Removed

- Removed `patience-funnel-side.png` and its round-8 crop credit; replaced it with three round-12 measured source photos. Removed the hand-built box funnel and three loose exhaust-pipe segments.
- Removed `round-11.jpg` and `round-11-review.md`; round 12 is the current sheet and review.
- Removed round-12 render images, the Blender review file, masks, grids, inspection scratch files and test logs from `.qa-dist/` and `.evidence/`; retained the two supplied task briefs.

## Round 13, step 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Patience triangle trim (7 November 2026)

- Recorded the pre-trim GLB triangle counts by named Patience mesh in `.qa-dist/patience-triangles.txt` before changing the recipe. The model had 49,648 triangles and 2,853,084 bytes; dense detail included 26,300 triangles in merged ship fittings, 6,500 in upperworks, 4,500 in the funnel, 4,608 in drifts, and 3,288 in anchor links.
- Lowered the Patience hull, upperworks and funnel carve targets to 800, 2,600 and 900; simplified chain link count and decimated joined rails, deck fittings, masts, propeller, and sand drift within their story-part meshes.
- Rebuilt and read back the GLB in Blender 4.5.13. The Patience is 12,651 triangles; GLB size is 1,409,144 bytes.
- Rendered and inspected the side and bow views from the exported GLB. The ship's silhouette, bridge, funnel and bow name remain legible and visually consistent with round 12. Browser checks are not applicable; Claude should judge the final six-view sheet.
- `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`: pending until the three-ship GLB is complete. Lane tier, build and browser checks are not run for this art card. Changed assertions: none. Race fingerprints: none.

### Removed

- Removed redundant triangles from joined Patience deck fittings, rails, mast hardware, chains and drifts through the recipe's applied decimation pass; no named story part was dropped.
- Removed this step's temporary Blender renders and logs after review; round-13 scratch renders remain temporarily while the sheet is assembled.

## Round 13, step 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Shared sister hull source (7 November 2026)

- Added credited, recoloured four-view hull photos for the Good Hope and the Marigold. Committed the generated Good Hope and Marigold cabin photo sets and credits, without carving either cabin. The Marigold is set to 72 m in the ship list.
- Reused the Patience carve as the sister hull source. Blender's GLB export does not retain object-linked material overrides on one shared mesh, so the sisters use copies of that mesh data with their own photo materials. The GLB therefore has three hull mesh records; this does not meet the card's one-mesh GLB requirement and needs Claude's decision before the next round.
- GLB read-back is 2,132,300 bytes (2.03 MiB); the family stays below the 3 MB limit.

### Removed

- No prior hull or cabin sources were removed; the cabin photo sets are committed for the next point.

## Round 13, step 4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Sister cabins (7 November 2026)

Cabins: carved the Good Hope's 14 x 9 x 9 m accommodation block and the Marigold's 15 x 10 x 6 m two-deck block from their measured four-view photos. The Good Hope reads as a closed, weathered dark wheelhouse with its mast on the roof; the Marigold reads as a rusted two-deck block with boarded windows, though her open bridge-wing gaps and texture transitions remain coarse in the close render. From the exported fleet GLB, the Patience is 12,436 triangles, the Good Hope 9,364, the Marigold 8,959, and the fleet total is 30,759 triangles; the file is 1,836,072 bytes.

- Retained `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png` for Claude's look review. Both use car-height cameras about 40 m from the cabin, three-quarter from the bow and stern respectively.
- `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. An initial run against the family export missed the fleet drift part; rebuilding with `--stage fleet` restored it, and the final run passed.
- `tools/test-repo-hygiene.mjs`: passed; size targets remain advisory. Lane tier, build, browser checks and race fingerprints were not run for this art-only change. Changed assertions: none. Race fingerprints: none. Claude should review the bridge-wing openings, cabin texture transitions, and mast placement in both retained renders.

### Removed

- Removed the Good Hope's and the Marigold's generic chart-room cubes, roofs, windows and doors; replaced them with their single photo-carved `upperworks` parts.
- Kept the source photographs at full resolution. The packed review export caps photo projections at 512 px and cabin images at 320 px to stay below the whole-file budget.

## Round 13, point 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Sister ship fit (7 November 2026)

- Kept each hull, deck plate, cabin, and deck fitting under its ship root so the root's list and pitch carry them together. Gave each deck plate its own `ship-*:deck` story part for measured bounds.
- Inset the sister deck plates to 64.8 x 10.8 m, inside the 72 x 12 m hull. Moved both cabin blocks to midships, where the hull keeps its beam; moved their funnels and mast with them. Updated the two 40 m check cameras to face the moved cabins.
- Wrote post-fix world-space bounds for each hull, deck plate, and cabin to `.qa-dist/fit.txt`. Rendered and inspected `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png`; the cabins now stand over the deck and do not reach the stern. The long plate edge remains visually prominent and needs Claude's review.
- Blender 4.5.13 family export completed: 38,599 triangles, 2,701,700 bytes read back from `ships.glb`. No lane tier or build run, per art-card rules. Browser checks are not applicable; Claude should inspect both retained check renders for deck alignment and cabin fit.
- Changed assertions: none. Race fingerprints: none; art-only.

### Removed

- Removed the sister ships' off-midship cabin placement and the former oversized deck-plate footprint. No Patience geometry was changed.

## Round 13, point 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Paint and bow photo (7 November 2026)

- Retoned the Marigold's hull and cabin materials to a muted, chalky ochre. The recipe grades packed material images in memory so the GLB keeps the color treatment; the credited source photos on disk are unchanged. Rust streaks and patches remain visible.
- Found the Good Hope's end-face material-slot error: the mesh has two side-photo slots before its front and rear slots. The bow and stern now use their measured, dead-on end photos and UV projection.
- Rebuilt the exported family and rendered both 40 m check views again. I inspected `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png`; the Marigold reads as faded tan and the Good Hope bow uses the correct end image. The bow's rail detail still bends with its carved surface; Claude should review that face.
- Blender 4.5.13 family export completed: 38,599 triangles and the GLB remains within the 3 MB limit. Required art checks remain for the final sheet commit. Changed assertions: none. Race fingerprints: none; art-only.

### Removed

- Removed the incorrect Good Hope side-photo mapping from her cabin bow face and removed the Marigold's bright yellow material treatment. The source photos remain unchanged.

## Round 13, step 3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Grounded fleet (7 November 2026)

- Set each root at its map x/z place. Added the Good Hope's 4-degree starboard list and 0.5 m bow drop, and the Marigold's 6-degree port list and 1 m stern drop. Each ship has its own trailing anchor chains and banked sand drift. The Marigold has an exposed 18 m shaft and propeller and half her rail is gone.
- Blender read-back by ship root: Patience 12,080 triangles, Good Hope 6,760, Marigold 6,408; 25,896 triangles total including 648 triangles of ground pieces. The whole GLB is 2,132,300 bytes, within the 50,000 triangle and 3 MB limits.
- `tools/test-blender-output.mjs`: passed, 381 checks; exit 0. `tools/test-repo-hygiene.mjs`: passed; exit 0. Lane tier and build were not run for this art card. Browser checks are not applicable; Claude should review the fleet's side-by-side placement, hull colors, listing angles, and named parts before the next round.
- Rendered and inspected `.qa-dist/check-fleet.png` at car height from about 120 m. All three hull colors and positions read in the view; cabins remain the temporary generic blocks for the next point. Changed assertions: none. Race fingerprints: none; art only.

### Removed

- Removed this run's check render, Blender review file, logs, and test output from `.qa-dist/` after inspection. Kept the supplied task briefs and the generated cabin source photos named by the card.

## Round 13, point 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Hull-following decks (7 November 2026)

- Replaced all three rectangular deck plates with flat plates built from the hull's tapered deck outline, inset 0.3 m from the plating. Moved the Patience's outer rails, forecastle, stairs and deck fittings inward; narrowed the Marigold's surviving rail line. Read-back bounds show each plate inside its hull. Rendered the fleet overhead and each ship from a car-height bow quarter; the hull is visible beneath the plate edge, though the narrow lip is still noticeable at the low camera angle. Claude should judge `.qa-dist/check-ships-above.png`, `.qa-dist/check-patience.png`, `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png`.
- Blender 4.5.13 read-back: 26,300 triangles and 1,605,836 bytes for the family. `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets remain advisory. Browser checks do not apply; lane tier and build were not run for this art card. Changed assertions: none. Race fingerprints: none.

### Removed

- Removed the three rectangular deck plates. The user-provided stray root render `.evidence-good-hope-bow-round13.png` was deleted.

## Round 13, point 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Good Hope bow photo (7 November 2026)

- Added one measured dead-on front reference for the Good Hope's closed, faded-black cabin block. `photo_grid.py` measurements are x-centre 700, deck y=1050 and roof y=232 in a 1448 x 1086 image. Corrected the front/rear material slots in the end-face UV fix: the GLB exporter merges the duplicate side slots, so the bow had been using the rear slot. Added forward end-photo preference to keep the side image from wrapping as far around the bow.
- Rendered `.qa-dist/check-good-hope.png` from the exported GLB at 40 m, car height and three-quarter from the bow, and inspected it. The bow now shows the new front photo and the former bright wavy streaks are gone; some image distortion remains at the curved corner. Claude should review that render and the new front reference. The side and stern source photos were not changed.
- Blender 4.5.13 GLB read-back: Patience 7,864 triangles, Good Hope 9,126, Marigold 8,676; family 26,302 triangles and 1,599,572 bytes. Each ship is below 13,000 triangles; the family is below 50,000 triangles and 3 MB. `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets remain advisory. Browser checks do not apply; lane tier and build were not run for this art card. Changed assertions: none. Race fingerprints: none.

### Removed

- Removed the incorrect bow-to-rear material-slot assignment and the previous Good Hope front-photo mapping in the carve. The replaced source file is retained; it is no longer loaded by the Good Hope.

## Round 13, points 1 and 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â heading and bulwarks (7 November 2026)

- Turned the Good Hope and Marigold 180 degrees at their existing map positions, moved their cabins, funnels and masts aft, and moved the Marigold's shaft and propeller to the stern. Lowered all three deck plates by 0.15 m and added hull-painted bulwarks with rounded caps. The above render shows northbound bows and aft cabins; the three 40 m close views show the hull edge rising to the cap, though the existing Good Hope rail remains visually prominent. Claude should inspect `.qa-dist/check-ships-above.png`, `.qa-dist/check-patience.png`, `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png`. Blender 4.5.13 GLB read-back: Patience 8,568 triangles, Good Hope 10,064, Marigold 9,790; whole file 42,668 triangles and 2,770,512 bytes. `tools/test-blender-output.mjs`: 381 checks passed, 0 failed after restoring family-stage drift parts. `tools/test-repo-hygiene.mjs`: passed; size targets advisory. Browser checks: Claude look review requested; no browser check run. Lane tier and build not run per art-card rules. Changed assertions: none. Race fingerprints: none; art only.

### Removed

- Removed the family-stage omission of the ships' standalone drift parts from the export path; no prior model parts were deleted.

## Round 13, heading correction (7 November 2026)

- Turned the Good Hope and Marigold to share the Patience's northbound heading without changing their map positions. Moved both accommodation blocks, funnels and masts aft; moved the Marigold's shaft and propeller to her stern. The straight-above GLB render shows the three bows aligned north and cabins aft; Claude should judge `.qa-dist/check-ships-above.png`. Changed assertions: none. Race fingerprints: none; art only. Blender lane tier and build were not run per art-card rules. `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs` remain for the completed card checks.

### Removed

- Removed no source or model parts; no earlier asset was replaced.


## Round 13, sheet and review (7 November 2026)

- Rendered six views from the exported GLB imported into an empty Blender scene, inspected each view, and made a 1600 x 1800 JPG sheet at 109,673 bytes. Updated only the whole-fleet, deck-view and Marigold stern review cameras in the Blender script; no ship geometry or materials changed. The camera work keeps all three ships in the fleet and overhead panels; the Marigold stern view now includes her shaft and propeller. Close framing remains imperfect and is recorded for Claude.
- `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. No lane tier, build, browser check or frame check was run for this art-only task. Changed assertions: none. Race fingerprints: none.
- Claude should judge all six views, especially the Good Hope bow angle and the pale cabin/smooth sand against the rusty hulls.

### Removed

- Removed `round-12.jpg` and `round-12-review.md`; round 13 is the current sheet and review.
- Removed this task's render images, Blender review scene, temporary count script, test outputs and logs from `.qa-dist/`. The two supplied task briefs remain.

## Round 14, point 1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Station-built hulls (7 November 2026)

- Replaced the three photo-carved ship hulls with one measured section builder using 31 stations sampled from the hull top grid. It makes the flat keel, 1.5 m bilge, parallel sides, raked bow, cruiser stern, and one-piece 1 m bulwark with a flat cap. The inset deck follows the same outline and sheer. Each ship uses its own side, bow and stern photos; names remain on both bow sides.
- Blender 4.5.13 exported and read back the family GLB: Patience 10,528 triangles, Good Hope 8,764, Marigold 8,795; total 41,375 triangles and 2,922,096 bytes. All are inside the card budgets.
- `tools/test-blender-output.mjs`: passed, 381 checks and 0 failures. `tools/test-repo-hygiene.mjs`: passed; repository size targets remain advisory. No changed assertions. Race fingerprints: none; art only. No browser or look verdict yet; point 2 renders follow in this run.

### Removed

- Removed the hull's `carve_object` table and hull-mask output, obsolete Patience hull view constants, the separate deck-edge bulwark wall and rounded rail, and the unused shared hull-photo material. The old striped hull rail treatment is no longer generated. `photo_carve` stays for the cabins, funnel and other carved pieces; the pilot boat keeps its separate hull recipe.

## Round 14, point 2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â exported-hull views (7 November 2026)

- Rendered the current family GLB into the four named check views from an empty Blender scene. Added a station at the cruiser stern, mapped the side and end photos against their own image sizes and measured grids, and made the deck plate follow the hull outline with adjoining quads. Adjusted the sister-ship sand banks to meet the wider lower hull. Moved all three bow names slightly aft so the far-side name no longer peeks beyond the stem, corrected the lettering to face outward on both sides, and moved the Marigold's removable 18 m shaft and propeller from beyond her bow to her stern. Reframed the car-height views around each ship's bow name.
- The car-height views show straight hull sides, raked bows and readable names. Sand covers most of the keel line, as the scene requires; the hull remains straight and flat where it emerges. The Marigold shaft now sits at her stern instead of extending from the bow.
- Blender 4.5.13 GLB read-back: Patience 10,640 triangles, Good Hope 8,876, Marigold 8,907; whole file 41,713 triangles and 2,934,320 bytes. All ship and file budgets pass.
- `tools/test-blender-output.mjs`: passed, 381 checks and 0 failures. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. No browser check, lane tier, build or frame check applies to this art task. Changed assertions: none. Race fingerprints: none.
- Claude should inspect `.qa-dist/check-patience.png`, `.qa-dist/check-good-hope.png`, `.qa-dist/check-marigold.png` and `.qa-dist/check-ships-above.png`.

### Removed

- Removed no source or model parts. The superseded bow-name placement, reversed far-side lettering and misplaced Marigold shaft transform were replaced in the Blender recipe.

## Round 14, point 1 Ã¢â‚¬â€ bows, drifts and Marigold propeller (7 November 2026)

- Reused each hull's side photograph across both end caps and moved the projection slightly inside the image edge, so the bow and stern carry the hull's dark plating and rust tone. Kept the red-brown lower hull and bow lettering. Rebuilt drift cross sections with more rows, rounded profiles, higher inner mounds and tapered ends. Replaced the Marigold's propeller ring and beam spokes with a hub and four twisted, tapered plate blades at the end of its named shaft.
- Rendered and inspected `.qa-dist/check-patience.png`, `.qa-dist/check-good-hope.png`, `.qa-dist/check-marigold.png` and `.qa-dist/check-ships-above.png`. The end caps now read as dark hull plating. The drifts have curved slopes and tapered edges but still read as somewhat strip-like in the low side views; Claude should judge those views. The propeller now has four plate blades.
- Blender 4.5.13 GLB read-back: 45,477 triangles, 2,853,904 bytes. `tools/test-blender-output.mjs`: 381 checks passed. `tools/test-repo-hygiene.mjs`: passed; size targets advisory. `tools/test-review-evidence.mjs` passes 9/9 when Claude runs it outside the sandbox; the local run failures came from sandbox `ffmpeg` `EPERM`. No browser check, lane tier, build or frame check applies to this art task. Changed assertions: none. Race fingerprints: none; art only.

### Removed

- Removed the pale bow and stern end-photo material assignment, the Marigold's propeller ring and beam spokes, and the prior coarse drift cross sections. No earlier art sheet has been removed in this point.
## Round 14, point 2 â€” review sheet (7 November 2026)

- Rendered six views from the exported GLB: the fleet, each ship at car height, above, and two deck views. Corrected the deck-view camera path so these shots use their own deck cameras instead of being reset to the bow close-up. Brightened and composed the 1600 x 1800 sheet; inspected it before submission. `round-14.jpg` is 93,892 bytes. The family view remains small and is called out for Claude.
- Added `round-14-review.md` with read-back triangle and file counts and the visual verdict. `tools/test-blender-output.mjs`: 381 checks passed. `tools/test-repo-hygiene.mjs`: passed; size targets advisory. `tools/test-review-evidence.mjs` passes 9/9 when Claude runs it outside the sandbox; the local run failures came from sandbox `ffmpeg` `EPERM`. Changed assertions: none. Race fingerprints: none. No browser check, lane tier or build applies to this art-only task.

### Removed

- Removed `round-13.jpg` and `round-13-review.md`; round 14 is the single current sheet and review.

## Round 15, point 1 — bow lettering, drifts, stems and cabins (7 November 2026)

- Mirrored starboard bow lettering so both sides read left to right. Replaced each ship's continuous side banks with four separate smooth heaps, two per side: one at the bow and one at the quarter point, each spreading 8 m onto the ground. The Marigold stem now samples her own side plating. Replaced the Good Hope and Marigold carved upperworks with crisp photo-projected blocks, decks and bridge wings at their measured sizes.
- Corrected the round 14 `test-review-evidence` note: Claude reports 9/9 passing outside the sandbox; the local failures came from sandbox `ffmpeg` `EPERM`.
- Blender 4.5.13 family export read back at 37,049 triangles and 2,772,620 bytes. No visual check has been recorded yet; point 2 renders and checks follow. Race fingerprints: none; art only.

### Removed

- Removed the continuous ship-side drift strips and the two sister ships' carved cabin meshes and their generated masks. No saved art sheet or source photo was removed.

## Round 15, point 2 (Claude): names on both sides, drift part (7 November 2026)

- The job's point 1 commit (9414d69ef) still mirrored the port names and split each ship's sand into separately named heaps, which failed `test-blender-output.mjs` ("Patience has a separate sand drift part"). Claude finished the point by hand.
- Bow names: one rule for both sides. Each name's face points outward, its up is world up and it reads along up x outward, so it reads left to right from outside on both bows, with no mirrored scale and no reversed string. The flat lettering is then turned into a mesh and each vertex moved out to the hull side at its own station (`hull_half_breadth`, `wrap_name_on_hull`), because the hull widens aft of the name and half of each word sank into the plating.
- Drifts: each ship's four heaps are one part again, `<ship>:drifts`.
- Port and starboard check renders from car height read PATIENCE, MARIGOLD and GOOD HOPE whole and left to right. Family export: 35,019 triangles and 2,719,288 bytes read back. `tools/test-blender-output.mjs`: 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed. Changed assertions: none. Race fingerprints: none; art only.

### Removed

- The mirrored-scale and reversed-string handling of the port bow names, and the per-heap drift objects.

## Round 15, part 2, point 1 — sand and cabin faces (7 November 2026)

- Lowered the spread-sand centre to the review ground plane. Reshaped each ship's paired drift banks as smaller rounded heaps that taper back to the ground. Cabin end faces now map the painted side photo across the face, and roof edges use a darker band from that photo.
- Rebuilt the family GLB with Blender 4.5.13 and rendered all six required port/starboard views. I inspected every image. Sand reads as small rounded mounds at the hull base, with no raised oval edge; cabin end faces carry plating texture instead of blank white panels. Claude should still review the remaining light photo trim around the cabin roofs.
- GLB read-back: Patience 10,640 triangles, Good Hope 10,796, Marigold 10,751; 35,019 total triangles and 2,587,488 bytes. No assertion changes. Race fingerprints: none; art only. The two named asset tests and review-evidence check will be recorded with the sheet commit.

### Removed

- Removed the above-ground center vertex from each oval ground heap and replaced the long, taller side-bank profiles with short rounded profiles. Removed the former end-photo UV mapping from cabin end faces.

## Round 15, part 2, point 2 — review sheet (7 November 2026)

- Rendered the six round 14 views from the exported family GLB, reframed the family and two close ship views, composed and inspected a 1600 x 1800 JPG. The ships fill at least half their panels, and the horizon sits in the lower third. `round-15.jpg` is 92,216 bytes. Cabin ends now sample painted side-plating crops; roof edges no longer sample the bright photo background.
- GLB read-back by named ship root: Patience 10,755 triangles, Good Hope 5,576, Marigold 5,650; whole file 35,019 triangles and 2,587,396 bytes. All budgets pass.
- `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets remain advisory. `tools/test-review-evidence.mjs`: 8 passed, 1 failed with sandbox `ffmpeg` `EPERM`; Claude should rerun it. No browser check, lane tier or build applies to this art card. Changed assertions: none. Race fingerprints: none. Claude should review the residual texture stretch on cabin ends and the low hull-side mounds.

### Removed

- Removed `round-14.jpg` and `round-14-review.md`; round 15 is the current sheet and review.

## Round 15, sheet (Claude): sand from the true ground, cabin ends restored (7 November 2026)

- Drift heaps are parented to each leaning ship, so their feet lifted off the ground on one side and showed as a flat slab at the waterline (and a plank by the Marigold's bow). Each heap's height is now measured from the real ground at y = -2, and the fuller heap shape (1.4 m against the hull, 8 m foot) is back, 12 m long at the bow and 9 m at the quarter.
- The job's `766756ed0` and `9d2606e12` painted the cabin end walls with a stretched strip of side plating, which blurred the fronts seen from the deck. Each end wall keeps its own photo again, trimmed 7% at the sides and top to drop white edges. Its lowering of the oval ground heaps to y = -2.0 stays.
- Recomposed `round-15.jpg` (1600 x 2404, 166,627 bytes) from the corrected model and rewrote `round-15-review.md`. Read-back: 35,019 triangles, 2,719,296 bytes. `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs` and `tools/test-review-evidence.mjs` (9 of 9, outside the sandbox) pass. Changed assertions: none. Race fingerprints: none.

### Removed

- The stretched-strip mapping of the cabin end walls and the shrunken 0.55 m drift heaps.

## Round 16, point 1 — bow plating and Marigold cabin edges (7 November 2026)

- Kept the bow flare on each ship's own side-plating photo, sampling inward from its pale studio edge. Added narrow rusted steel corner and roof-edge trim to the Marigold's cabin, leaving its own end photos intact.
- Point 1 source change is committed before the five point 2 renders and required checks. Claude should inspect the five named round 16 views for the bow flare and Marigold cabin corner/roof edges.
- No assertion changes. Race fingerprints: none; art only. Browser and look checks are Claude's.

### Removed

- Removed no source parts, photos, assertions, or review sheets.

## Round 16, point 2 — checked views (7 November 2026)

- Rendered and inspected `port-patience`, `starboard-good-hope`, `port-marigold`, `starboard-marigold` and `deck-marigold` from the final export. The bow flares now sample darker adjacent side plating. The Marigold cabin's bright roof/photo edge is covered by its own upperworks crop and narrow rusted steel edge trim; its end walls still use their own photos.
- Final GLB read-back: 35,115 triangles and 2,727,300 bytes. All ship triangle limits and the 50,000-triangle / 3 MB family limits pass.
- `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. No assertion changes. Race fingerprints: none; art only. No browser check, lane tier or build applies.
- Claude should judge those five views, especially the remaining paint balance where the bows turn into their stems and the Marigold's rusted roof edge.

### Removed

- Removed the temporary round 16 renders, review Blend, detail crop and check logs after inspection. No source photos, prior review sheets or model parts were removed.

## Round 16, sheet (Claude): the sisters are done (7 November 2026)

- Rendered nine views from the round 16 model and composed `round-16.jpg` (1600 x 3004, 199,432 bytes) with `round-16-review.md`. Read-back: 35,115 triangles, 2,727,300 bytes. The Good Hope and the Marigold are done after their fourth round.

### Removed

- `round-15.jpg` and `round-15-review.md`; round 16 is the single current sheet.

## Lighthouse round 1, point 1 — measured tower (7 November 2026)

- Replaced the tapered placeholder with a 32-sided tower built from a measured 16-station radius profile read against a 50 px grid on `lighthouse-stone-photo.jpg`. The wall uses cylindrical photo projection and has real door and three landing-window voids with deep reveals. Added the flared foot, stone courses, three interior landings, the gallery deck and iron rail, glazed lantern room, mullions, domed cap and ventilator ball. Kept the stair, door, swept step, drawings, letter box and named lamp/beam parts; refit the stair and landing rails to the taper.
- Blender 4.5.13 family export/read-back: 38,931 triangles and 2,976,300 bytes. Build log: `.qa-dist/lighthouse-point1-build.log`. The file is within the 50,000 triangle and 3,000,000 byte limits.
- Checks for the completed two-point task will be recorded after point 2. Changed assertions: none. Race fingerprints: none; art only. Claude should inspect the three lighthouse check renders.

### Removed

- Removed the old `lighthouse tapered masonry` mesh and its unused `weathered-plank` material slot, including its five eye-set rings and broad photo UV fallback. Removed the old 48-sided landing slabs and outside-the-wall landing-post placement; replaced them with fitted landings and rails inside the new tower profile. No ship parts or earlier look sheets were changed.

## Lighthouse round 1, point 2 — render checks (7 November 2026)

- Added `lighthouse-road`, `lighthouse-dusk` and `lighthouse-landing` to `--render-view`. Rendered and inspected `.qa-dist/check-lighthouse-road.png`, `.qa-dist/check-lighthouse-dusk.png` and `.qa-dist/check-lighthouse-landing.png` from the exported GLB. The road views frame the tower at car height from 40 m. The lantern glows in the dusk view and the rotating-beam part is visible. The road view reads as a tall tapering lighthouse with a flared foot, gallery, door and three recessed windows. Stone texture still stretches around the curved sides; Claude should judge it. The landing view is weak: the camera sees mostly the close inner wall and the drawings are not readable. Claude should judge the interior view and the tower finish before approving the look.
- Final Blender 4.5.13 GLB read-back: 38,931 total triangles; 4,068 lighthouse triangles; 2,977,568 bytes. Both budgets pass. `tools/test-blender-output.mjs`: 381 checks passed, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. No assertion changes. Race fingerprints: none; art only. No lane tier, build, browser or look check was run; browser and art verdict remain Claude's.

### Removed

- Removed this round's temporary review Blend, source-photo grid and build/render/test logs from `.qa-dist/` and `.evidence/` after inspection. Kept the three requested lighthouse check PNGs for Claude. No previous ship review evidence was changed.

## Lighthouse round 1 part 2 (7 November 2026)

- Point 1: wrapped the measured stone photo around the full shaft using a
  mirrored, embedded tile at about a 0.8 m repeat; made the stone matte.
- Recessed the spiral stair and landing rails behind the inner wall, removed
  the stray external spiral, reshaped the gallery deck and corbels, and made
  the lantern cap dark iron with a ventilator ball. Replaced the old beam bar
  with a translucent 14 m widening mesh on `lighthouse:beam`.
- Point 2: added whitewashed inner stone, warm amber sconces on all three
  landings, and bright crayon pictures of a ship, house and sun. Moved the
  landing camera to the first landing, 1.6 m above its floor, aimed across the
  landing at the drawings. Attached every gallery and landing rail piece to
  the lighthouse root so none remains at the world origin.
- Final GLB read-back: 5,974 lighthouse triangles; 38,029 triangles total;
  2,927,540 bytes. Both triangle budgets and the 3 MB family size limit pass.
- `tools/test-blender-output.mjs`: passed, 381 checks; 0 failed.
  `tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- Rendered and inspected `.qa-dist/check-lighthouse-road.png`,
  `.qa-dist/check-lighthouse-dusk.png` and
  `.qa-dist/check-lighthouse-landing.png`. The road view reads as a tall,
  tapering stone tower with the lantern room and gallery; the stone repeats
  visibly. Dusk shows the warm lantern and widening beam. The landing view
  shows all three drawings and an amber wall lamp; the iron ring rail sits
  below the pictures. Claude should judge those three views and the repeated
  stone finish.
- Browser checks: Claude handles them. Lane tier and build were not run, as
  required for art cards.
- Changed assertions: none. Race fingerprints: none; art only.

### Removed

- Removed the straight yellow beam cube and the exposed outer spiral stair.
- Removed temporary Blender build/render/test logs, the fit report, generated
  masks and exported-model review Blend from `.qa-dist/`. Kept the three named
  check pictures and both supplied task briefs.

## Lighthouse round 1, sheet (Claude): round 17 (7 November 2026)

- Sheet `docs/board/looks/ww-art-ships/round-17.jpg` (1600 x 1778): the tower from the road at car height, at dusk with the lamp on, and the first landing inside. Review in `round-17-review.md`. This is the lighthouse's first of six rounds.
- Verdict: the shape, gallery, dark iron dome and lantern are right and the stray spiral is gone. Still wrong: the stone shows as a mirrored repeating pattern with a pale streak down one side; the windows show white L shapes and the door a white slab; the beam reads as a solid capped pipe at dusk; the landing view shows a grey space with stick drawings and a floating rail.
- `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs` and `tools/test-review-evidence.mjs`: run by Claude, results in the review. Changed assertions: none. Race fingerprints: none; art only.

### Removed

- `round-16.jpg` and `round-16-review.md`; round 17 is the single current sheet.

## Lighthouse round 2 (8 November 2026)

- Point 1: remapped the lighthouse stone from a clean, unmirrored crop at 2.5 m by 2 m scale, staggered course rows, and fixed the cylindrical UV seam and radius mapping. Rebuilt the window and door recesses with dark backing, painted panes and a set-back wood door. Replaced the capped beam with a tapered, alpha-faded cone.
- Built the `family` stage for round 18. Blender read back 39,145 triangles total and 2,982,420 bytes; the lighthouse is within its 6,000-triangle budget; the final per-part count is recorded below.
- Rendered and inspected `.qa-dist/check-lighthouse-road.png` and `.qa-dist/check-lighthouse-dusk.png`. The road view has a clean tower silhouette and visible texture, though the masonry still looks uneven at this distance and the door surround reads pale. Dusk shows a tapered light with a pointed end and visible fade; its edges remain harder than ideal. Claude should review the road stone and the beam softness.
- Checks `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`: deferred until point 2 and will be recorded in its update. Browser and look checks: Claude runs. Lane tier and build were not run, as required for art cards.
- Changed assertions: none. Race fingerprints: none; art only.

- Point 2: made the landing floor readable with wood-colored boards, added a whitewashed textured inner wall, set the camera to a 28 mm lens, and replaced the stick drawings with three pinned cream sheets carrying filled crayon pictures. Removed the old loose drawing strokes and the first-landing ring rail; added a stair-following rail, though it remains hard to see in the current camera view.
- Rebuilt and rendered all three final views: `.qa-dist/check-lighthouse-road.png`, `.qa-dist/check-lighthouse-dusk.png`, and `.qa-dist/check-lighthouse-landing.png`. Road view: the tower silhouette holds, but the masonry remains visibly uneven and faceted, and the door surround still reads pale. Dusk: the beam tapers to a point and fades, but its edge remains hard. Landing: floor, curved pale wall and filled drawings are visible; the stair rail is not clearly legible and the window daylight is subdued. Claude should judge those three views before acceptance.
- Final GLB read-back: 5,864 lighthouse triangles; 37,919 triangles total; 2,916,012 bytes. All budgets pass.
- `tools/test-blender-output.mjs`: passed, 381 checks; 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. Browser and look checks: Claude runs. Lane tier and build were not run, as required for art cards.
- Changed assertions: none. Race fingerprints: none; art only.

### Removed

- Removed the mirrored 0.8 m stone tile, the exposed white opening backings, and the capped beam mesh.
- Removed the first-landing ring rail and the old loose crayon strokes when pinned filled drawings replaced them.
## Lighthouse round 2, Claude's fixes and sheet: round 18 (8 November 2026)

- The job's build ended with a blanket decimation of the whole lighthouse (ratio 0.62) to meet its 6,000-triangle share. It collapsed the tower into rows up to 7 m tall, stretched the stone, broke the windows into cage shapes and bent the drawings. Removed it; the share is now met by trimming named pieces: 20-sided landing floors and stone bands, four posts on each upper landing handrail, 16 gallery posts and rail lengths, smaller spheres for the bulbs, pins and ventilator ball, a flat disc for the drawn sun, a 16-sided dome and beam, and 24-sided lantern, eave and gallery deck.
- The stone was a 32 x 40 pixel crop of the photo stretched over each tile. It is now laid block by block in a 4 m by 2 m tile of five 0.4 m courses: each block takes its colour from a block-sized patch of the reference tower's plain masonry, with noise grain, worn arrises, broken salt runs and lime mortar. Each 2 m band wraps a whole number of tiles round the tower and is offset from the band below, so seams fall on mortar lines. The tower is smooth shaded. The whitewashed inner wall uses the same stone at half size.
- No window or door was ever a hole: each opening was narrower than one face of the 20-sided tower, so no face was left out, and the frames sat on solid wall. The tower is turned half a face so a face is centred on the front, and each opening leaves that whole face out of both walls. Reveals run through the full wall thickness. The first two windows moved up 1 m so they sit above their landings.
- The door opening was 3.9 m tall round a 1.8 m door painted with the gatehouse stone photo. It is now 2.6 m tall, with a 2.3 m door of four painted boards, two ledges and an iron ring, set back on a stone step.
- The beam is an open cone in four lengths, each fainter than the one before (strengths 1, 0.6, 0.32 and 0.12), with no end cap.
- The box of letters stood outside the inner wall and showed through the tower as a cage; it now stands on the second landing. The landing camera stands at the back of the first landing with a 24 mm lens, and the floor boards are three shades.
- Sheet `docs/board/looks/ww-art-ships/round-18.jpg` (1600 x 1778): from the road, at dusk, and the first landing. Review in `round-18-review.md`.
- Final read-back: lighthouse 5,996 triangles before merging; whole file 38,051 triangles and 2,903,336 bytes. `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs` and `tools/test-review-evidence.mjs`: results in the review. Changed assertions: none. Race fingerprints: none; art only.

### Removed

- The blanket lighthouse decimation, the stretched photo stone tile, the stick-drawing strokes that were built and then deleted, the sphere sun and the old door slab.
- `round-17.jpg` and `round-17-review.md`; round 18 is the single current sheet.

## Lighthouse round 3 (8 November 2026)

- Point 1: kept the existing course wrapping and tower openings. Masonry blocks now vary from 0.4 to 1.5 m, with one in eight deliberately lighter or darker. Added a separate translucent salt veil with a packed greyscale alpha texture, ragged tide edge and hanging runs under the gallery and window levels. It stays within 400 triangles.
- Rendered and inspected `.qa-dist/check-lighthouse-road.png` and `.qa-dist/check-lighthouse-dusk.png`. Road: varied blocks and pale salt strands are visible; the foot band is subtle. Dusk: the lantern and beam read clearly, while the salt is fainter under night lighting. Claude should judge salt visibility and stone contrast in these two views.
- Point 2: moved the first landing sconce to the wall right of the sun drawing, 1.9 m above the floor. Replaced broad boards with 0.17 m top strips, dark gaps and three wood shades, running from the window toward the camera. Added the 900 x 900 `lighthouse-above` view, 35 m from the tower at about 50 degrees down.
- Rendered and inspected `.qa-dist/check-lighthouse-landing.png` and `.qa-dist/check-lighthouse-above.png`. The landing shows the drawings, warm sconce and narrow boards with visible seams. The above view shows the full tower, foot, gallery, lantern and dome. Claude should judge the sconce placement, board shades, and above framing. No sheet was made; Claude makes it.
- Final GLB read-back: lighthouse assembly 5,994 triangles (tower mesh 5,586; glazing 92; beam 128; lantern lamp 188), whole file 38,061 triangles and 2,928,272 bytes. All budgets pass.
- `tools/test-blender-output.mjs`: passed, 381 checks; 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets are advisory. Browser and look checks are Claude's. Lane tier and build were not run, as required for art cards.
- Changed assertions: none. Race fingerprints: none; art only.

### Removed

- Removed the old nine broad landing boards and replaced them with narrow flat strips to preserve the board direction and gaps within the lighthouse budget.
- No lighthouse parts were automatically decimated. Lowered only named detail counts on the stone bands, gallery rails and landing bulbs to fit the 6,000-triangle lighthouse limit.
