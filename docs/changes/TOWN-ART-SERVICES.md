# TOWN-ART-SERVICES change note

## Split the service family

Moved toll-bank, school, radio-mast, helipad and notice-board into
`services-2.glb`, rooted at `town-services-2`. The original family now keeps
the seven passed buildings. No assertions for those seven changed; only the
five moved ids and their budgets moved to the new family check. Both family
files retain the 8 MB cap.

The original export was 7,726,444 bytes; the rebuilt seven-building export is
7,323,756 bytes. Node names and triangle counts are unchanged:

| Building | Before | After |
| --- | ---: | ---: |
| town-hall | 6,008 | 6,008 |
| scrapyard | 8,770 | 8,770 |
| forge | 3,844 | 3,844 |
| workshop | 8,895 | 8,895 |
| motor-pool | 13,260 | 13,260 |
| paint-shop | 4,784 | 4,784 |
| trading-post | 8,990 | 8,990 |

The final `services-2.glb` is 1,029,872 bytes. It has all five ids as direct
children of `town-services-2`, including `radio-mast:lamp`. Their final counts
are toll-bank 3,952, school 3,120, radio-mast 1,092, helipad 1,456 and
notice-board 176.

## Toll bank, round 11

Built the toll bank from the four committed orthographic photos. `carve_object`
shapes the strongroom; its door, wheel, hinges, roof plates, booth, porch,
barrier arm, posts and striped bands are separate parts. The door sets the
scale at about 2 m. The photo-carved shell is about 7.6 by 7.8 m and ends at
the roof eave; the four photo-mapped roof plates meet the shell there. The
strongroom crown is 2.4 m high. The roof and shell stay within the 2 by 2 cell
plot, with at least 0.5 m clearance.

The piece audit printed each piece's bounds and found every piece within the
plot, touching the ground or another piece. The full toll bank uses 3,952
triangles against its 5,000 limit. The model export is 1.03 MB. The final
sheet is 2,048 by 4,528 pixels and 454,369 bytes; the source photos and model
renders remain at their full 1,024-pixel width.

The front photo's roof peak scales to about 2.8 m from its door, while the
side profile limits the crown to about 2.4 m. The side profile controls the
roof height so the shell and hipped roof stay continuous. The front pair in
the sheet records the remaining difference for Claude's review.

### Checks and review

- Blender 4.5.13 exported `services-2.glb`; its piece bounds and contacts
  passed.
- `node tools/test-blender-output.mjs`: 386 checks passed, 0 failed. The
  first run found 5,860 toll-bank triangles; reducing the carved shell target
  and removing duplicate photo-baked rivets brought the final count under
  budget. No assertion changed.
- `node tools/test-repo-hygiene.mjs`: passed. It reported existing advisory
  size targets; no placement error.
- `node tools/test-review-evidence.mjs`: 635 checks passed, 0 failed across
  9 subtests. Its in-sandbox audio subtest could not spawn `ffmpeg` (EPERM);
  rerunning with the installed `FFMPEG_PATH` outside the sandbox passed.
- The sheet shows the strongroom alone in four matched orthographic views,
  then the full toll bank in both three-quarter views and the mayor view.
- Browser checks were not run. Claude should review the front roof height
  against the side profile, the door and barrier, and the booth and canopy in
  both three-quarter views and from the mayor's view.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

## Removed

- Removed the five moved building generators from `town-services.py` and
  removed their nodes from `services.glb`.
- Replaced the toll bank's simple block placeholder with the photo-carved
  shell and its named pieces. Removed separately modeled wall rivets because
  the carved photos already show them.
- No other assets or checks were removed.

## Toll bank, round 12

The seven passed buildings in `services.glb` remain byte-for-byte unchanged.
Updated only the toll bank inside `services-2.glb`: the separate door now wears
the front photo's rounded door region, including its wheel, rivets and hinges,
inside a heavy frame. Replaced the undersized toll scene with a long striped
barrier across the road-side lane, a counterweighted post and a larger booth
with a visible window and its own roof. The shell, roof and source photos that
matched remain in place.

The side, front and rear renders now frame the entire strongroom. The review
sheet compares all four orthographic photo/render pairs, both three-quarter
views and the mayor view with other buildings hidden. The sheet is
`docs/board/looks/town-art-services/round-12.jpg` (312,084 bytes). The GLB is
1,113,008 bytes; the toll bank uses 3,300 of 5,000 triangles. The piece bounds
and contact audit passed. Every piece is inside the 2-by-2 plot with at least
0.5 m spare and touches the ground or another piece.

### Checks and review

- Blender 4.5.13 export and piece bounds/contact audit: passed.
- `node tools/test-blender-output.mjs`: 386 checks passed, 0 failed; run to
  completion on this GLB.
- Lane tier and build were not run, as required for art cards.
- Browser and in-game checks were not run. Claude should check the door's
  photo alignment and the booth, counterweight and striped barrier from both
  three-quarter views and the mayor view.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

### Removed

- Replaced the flat brown door panel with the photo-wearing door slab and
  removed separately modeled wheel/hinge details already present in the photo.
- Replaced the undersized barrier and booth with the full lane gate and
  windowed booth.
- No other assets or checks were removed.

## School, round 13

Compared the committed bus photos and draft sheet, then corrected the exported
school model: retained the photo-mapped tyre materials, added low-poly raised
rubber shoulders and visible hubs, and opened the straight-down camera so the
whole bus fits. The final school uses 8,716 of its 9,000 triangle budget after
reducing the carve target to 5,200 and omitting high-triangle lug bolts. The
lean-to, chalkboard and passed toll bank remain in `services-2.glb`; the school
remains within its 3 by 2 cell footprint. The family GLB is 1,747,864 bytes.

Rendered the exported GLB in a clean scene and rebuilt
`docs/board/looks/town-art-services/round-13.jpg` (1,600 by 1,600 pixels,
245,894 bytes). It shows side, front, rear and above photo/model pairs at
matched orthographic views, both three-quarter views and the mayor view, with
other buildings hidden. Claude should review the front and rear silhouettes,
wheel detail, lean-to attachment and chalkboard readability in the sheet.

### Checks and review

- Blender 4.5.13 export and all 34 school piece bounds/contact checks: passed.
- `node tools/test-blender-output.mjs`: final run, 386 checks passed, 0 failed.
  Earlier runs exceeded the unchanged school triangle budget (14,816 and
  10,016); the final model is 8,716 triangles.
- Browser and in-game checks were not run; Claude handles those checks.
- Lane tier and build were not run, as required for art cards.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

### Removed

- Removed the flat rubber material override that hid tyre-photo detail and
  omitted high-triangle lug bolts from the final recipe.
- No buildings, source photos or checks were removed.
