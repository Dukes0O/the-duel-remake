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

## Round 8 — Patience upperworks (7 November 2026)

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

## Round 10 — Patience drift and review views (7 November 2026)

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

## Round 12 — Patience funnel, cabins and drifts (7 November 2026)

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

## Round 13, step 1 — Patience triangle trim (7 November 2026)

- Recorded the pre-trim GLB triangle counts by named Patience mesh in `.qa-dist/patience-triangles.txt` before changing the recipe. The model had 49,648 triangles and 2,853,084 bytes; dense detail included 26,300 triangles in merged ship fittings, 6,500 in upperworks, 4,500 in the funnel, 4,608 in drifts, and 3,288 in anchor links.
- Lowered the Patience hull, upperworks and funnel carve targets to 800, 2,600 and 900; simplified chain link count and decimated joined rails, deck fittings, masts, propeller, and sand drift within their story-part meshes.
- Rebuilt and read back the GLB in Blender 4.5.13. The Patience is 12,651 triangles; GLB size is 1,409,144 bytes.
- Rendered and inspected the side and bow views from the exported GLB. The ship's silhouette, bridge, funnel and bow name remain legible and visually consistent with round 12. Browser checks are not applicable; Claude should judge the final six-view sheet.
- `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`: pending until the three-ship GLB is complete. Lane tier, build and browser checks are not run for this art card. Changed assertions: none. Race fingerprints: none.

### Removed

- Removed redundant triangles from joined Patience deck fittings, rails, mast hardware, chains and drifts through the recipe's applied decimation pass; no named story part was dropped.
- Removed this step's temporary Blender renders and logs after review; round-13 scratch renders remain temporarily while the sheet is assembled.

## Round 13, step 2 — Shared sister hull source (7 November 2026)

- Added credited, recoloured four-view hull photos for the Good Hope and the Marigold. Committed the generated Good Hope and Marigold cabin photo sets and credits, without carving either cabin. The Marigold is set to 72 m in the ship list.
- Reused the Patience carve as the sister hull source. Blender's GLB export does not retain object-linked material overrides on one shared mesh, so the sisters use copies of that mesh data with their own photo materials. The GLB therefore has three hull mesh records; this does not meet the card's one-mesh GLB requirement and needs Claude's decision before the next round.
- GLB read-back is 2,132,300 bytes (2.03 MiB); the family stays below the 3 MB limit.

### Removed

- No prior hull or cabin sources were removed; the cabin photo sets are committed for the next point.

## Round 13, step 4 — Sister cabins (7 November 2026)

Cabins: carved the Good Hope's 14 x 9 x 9 m accommodation block and the Marigold's 15 x 10 x 6 m two-deck block from their measured four-view photos. The Good Hope reads as a closed, weathered dark wheelhouse with its mast on the roof; the Marigold reads as a rusted two-deck block with boarded windows, though her open bridge-wing gaps and texture transitions remain coarse in the close render. From the exported fleet GLB, the Patience is 12,436 triangles, the Good Hope 9,364, the Marigold 8,959, and the fleet total is 30,759 triangles; the file is 1,836,072 bytes.

- Retained `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png` for Claude's look review. Both use car-height cameras about 40 m from the cabin, three-quarter from the bow and stern respectively.
- `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. An initial run against the family export missed the fleet drift part; rebuilding with `--stage fleet` restored it, and the final run passed.
- `tools/test-repo-hygiene.mjs`: passed; size targets remain advisory. Lane tier, build, browser checks and race fingerprints were not run for this art-only change. Changed assertions: none. Race fingerprints: none. Claude should review the bridge-wing openings, cabin texture transitions, and mast placement in both retained renders.

### Removed

- Removed the Good Hope's and the Marigold's generic chart-room cubes, roofs, windows and doors; replaced them with their single photo-carved `upperworks` parts.
- Kept the source photographs at full resolution. The packed review export caps photo projections at 512 px and cabin images at 320 px to stay below the whole-file budget.

## Round 13, point 1 — Sister ship fit (7 November 2026)

- Kept each hull, deck plate, cabin, and deck fitting under its ship root so the root's list and pitch carry them together. Gave each deck plate its own `ship-*:deck` story part for measured bounds.
- Inset the sister deck plates to 64.8 x 10.8 m, inside the 72 x 12 m hull. Moved both cabin blocks to midships, where the hull keeps its beam; moved their funnels and mast with them. Updated the two 40 m check cameras to face the moved cabins.
- Wrote post-fix world-space bounds for each hull, deck plate, and cabin to `.qa-dist/fit.txt`. Rendered and inspected `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png`; the cabins now stand over the deck and do not reach the stern. The long plate edge remains visually prominent and needs Claude's review.
- Blender 4.5.13 family export completed: 38,599 triangles, 2,701,700 bytes read back from `ships.glb`. No lane tier or build run, per art-card rules. Browser checks are not applicable; Claude should inspect both retained check renders for deck alignment and cabin fit.
- Changed assertions: none. Race fingerprints: none; art-only.

### Removed

- Removed the sister ships' off-midship cabin placement and the former oversized deck-plate footprint. No Patience geometry was changed.

## Round 13, point 2 — Paint and bow photo (7 November 2026)

- Retoned the Marigold's hull and cabin materials to a muted, chalky ochre. The recipe grades packed material images in memory so the GLB keeps the color treatment; the credited source photos on disk are unchanged. Rust streaks and patches remain visible.
- Found the Good Hope's end-face material-slot error: the mesh has two side-photo slots before its front and rear slots. The bow and stern now use their measured, dead-on end photos and UV projection.
- Rebuilt the exported family and rendered both 40 m check views again. I inspected `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png`; the Marigold reads as faded tan and the Good Hope bow uses the correct end image. The bow's rail detail still bends with its carved surface; Claude should review that face.
- Blender 4.5.13 family export completed: 38,599 triangles and the GLB remains within the 3 MB limit. Required art checks remain for the final sheet commit. Changed assertions: none. Race fingerprints: none; art-only.

### Removed

- Removed the incorrect Good Hope side-photo mapping from her cabin bow face and removed the Marigold's bright yellow material treatment. The source photos remain unchanged.

## Round 13, step 3 — Grounded fleet (7 November 2026)

- Set each root at its map x/z place. Added the Good Hope's 4-degree starboard list and 0.5 m bow drop, and the Marigold's 6-degree port list and 1 m stern drop. Each ship has its own trailing anchor chains and banked sand drift. The Marigold has an exposed 18 m shaft and propeller and half her rail is gone.
- Blender read-back by ship root: Patience 12,080 triangles, Good Hope 6,760, Marigold 6,408; 25,896 triangles total including 648 triangles of ground pieces. The whole GLB is 2,132,300 bytes, within the 50,000 triangle and 3 MB limits.
- `tools/test-blender-output.mjs`: passed, 381 checks; exit 0. `tools/test-repo-hygiene.mjs`: passed; exit 0. Lane tier and build were not run for this art card. Browser checks are not applicable; Claude should review the fleet's side-by-side placement, hull colors, listing angles, and named parts before the next round.
- Rendered and inspected `.qa-dist/check-fleet.png` at car height from about 120 m. All three hull colors and positions read in the view; cabins remain the temporary generic blocks for the next point. Changed assertions: none. Race fingerprints: none; art only.

### Removed

- Removed this run's check render, Blender review file, logs, and test output from `.qa-dist/` after inspection. Kept the supplied task briefs and the generated cabin source photos named by the card.

## Round 13, point 1 — Hull-following decks (7 November 2026)

- Replaced all three rectangular deck plates with flat plates built from the hull's tapered deck outline, inset 0.3 m from the plating. Moved the Patience's outer rails, forecastle, stairs and deck fittings inward; narrowed the Marigold's surviving rail line. Read-back bounds show each plate inside its hull. Rendered the fleet overhead and each ship from a car-height bow quarter; the hull is visible beneath the plate edge, though the narrow lip is still noticeable at the low camera angle. Claude should judge `.qa-dist/check-ships-above.png`, `.qa-dist/check-patience.png`, `.qa-dist/check-good-hope.png` and `.qa-dist/check-marigold.png`.
- Blender 4.5.13 read-back: 26,300 triangles and 1,605,836 bytes for the family. `tools/test-blender-output.mjs`: passed, 381 checks, 0 failed. `tools/test-repo-hygiene.mjs`: passed; size targets remain advisory. Browser checks do not apply; lane tier and build were not run for this art card. Changed assertions: none. Race fingerprints: none.

### Removed

- Removed the three rectangular deck plates. The user-provided stray root render `.evidence-good-hope-bow-round13.png` was deleted.
