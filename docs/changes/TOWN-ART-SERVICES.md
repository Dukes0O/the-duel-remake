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
