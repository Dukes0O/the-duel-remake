# WW-ART-PEACE round 6: dust tanker

Changed `dust-tanker` only. The earlier look sheets and the four committed
source photos remain in place.

## Changes

- Carved only the cab with `hull_model.py`, using side, front and overhead
  masks trimmed at the cab boundary. The rear tanker photo does not enter the
  cab hull.
- Built the fuel tank as a lengthwise lathe. Its side profile comes from the
  side-photo mask, the side photo wraps by height with arc scaling, and the
  rear photo fills a circular end cap. Separate traced slabs form the tarp on
  both sides. Four measured photo wheels sit on the ground plane with dark
  photo-derived treads; two traced side slabs form the frame rails.
- Kept source JPEGs untouched. Each embedded tanker photo copy is whole and
  scaled to 1024 px wide, with no crop.
- Added the named tanker root and parts to the existing Blender-output test.
  No assertion was loosened. No race fingerprints apply.
- Added `docs/board/looks/ww-art-peace/round-6.jpg` (1600 x 888 px,
  216,303 bytes). The top row pairs the complete side source photo and a
  same-sized side render. The bottom row shows front and rear three-quarter
  views at 15 m and car height. All views came from the exported GLB imported
  into an empty scene, with other meshes hidden and the Standard view transform.

## Checks

- Blender export and GLB import/render: passed. Readback: 33,340 triangles;
  3,003,984 bytes.
- `node tools/test-blender-output.mjs`: passed, 304 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement clean.
- Browser and in-game look checks were not run here. Claude should judge the
  goggle visibility from the front three-quarter view, cab and tank seams,
  tarp edges, wheel fit, frame rails and rear cap. The goggles read clearly
  head-on, but they are partly lost at the three-quarter angle. White photo
  edges and seams remain around the cab and tank ends in the review renders.
- No lane tier or build was run; the art brief reserves those checks for Claude.

## Self-review

Would a child laugh? **Yes, head-on: the oversized painted goggles are clear
and silly.** From the submitted three-quarter angles they are less obvious.
Does it hold together from three-quarters? **It reads as one tanker with its
load, cab and wheels, but visible photo edges and seams keep the model from
looking fully clean.** Claude should make the final art call.

## Removed

- No tracked source files or earlier round sheets were removed.
- Temporary renders, debug captures, and test logs from this lane are deleted
  after recording this note.
