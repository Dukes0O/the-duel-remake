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

`services-2.glb` is 562,052 bytes. It has all five ids as direct children of
`town-services-2`, including `radio-mast:lamp`. Its current triangle counts
are toll-bank 880, school 3,120, radio-mast 1,092, helipad 1,456 and
notice-board 176.

### Checks

- Rebuilt both GLBs with Blender 4.5.13, four threads: passed.
- Compared each original building's complete node-name set and triangle count
  against the committed pre-split GLB: all seven unchanged.
- Inspected the two exported roots, direct children, sizes and per-building
  counts: passed; all moved buildings fit their stated triangle budgets.
- `node tools/test-blender-output.mjs`: held until the toll-bank round is
  complete, then will run once on the finished lane.
- Browser and visual review: Claude should review `round-11.jpg` beside the
  four source photos, with the building isolated in all seven views.
- Race fingerprints: not applicable to these town art exports.
- Changed assertions: moved only the five ids and their existing budgets;
  added equivalent per-building checks for the new family. No assertion was
  loosened.

## Removed

- Removed the five moved building generators from `town-services.py` and
  removed their nodes from `services.glb`.
- No other assets or checks were removed.
