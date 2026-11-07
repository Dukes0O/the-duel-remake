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
- Funnel-stage GLB read-back: 49,648 triangles and 2,873,984 bytes. Final six-view sheet and remaining round changes will be recorded here after review.
- Changed assertions: none. Race fingerprints: none; art only. Browser and review checks: Claude should inspect the final six-view sheet, especially the funnel and drift edges.

## Removed

- Removed `patience-funnel-side.png` and its round-8 crop credit; replaced it with three round-12 measured source photos. Removed the hand-built box funnel and three loose exhaust-pipe segments.
