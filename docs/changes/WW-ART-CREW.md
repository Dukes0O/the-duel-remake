# WW-ART-CREW

Card still open: the harpoon, piano and Gerald remain as Claude passed them.

## Changed

- Added `gerald-box`, a 40 cm photo-built carrier with photographed holes.
  Its front and three-quarter views were rendered from the exported GLB and
  inspected beside the front reference. It reads as a small weathered wooden
  box, not a toy.
- `tools/blender/crew-favours.py`: adds the box as a named child of the root.
- `public/assets/models/wasteland/scablands/textures/ww-gerald-box.jpg` and its
  prompt credit in `CREDITS.md`.
- Added `ash-hat`, using a radius read from the side photo and a real thin brim.
  The side and quarter exported-GLB renders were inspected beside the
  reference. The silhouette reads as a worn hat; its dent is slightly
  mechanical at close range, but it does not read as a toy at prop scale.
- Added `ww-ash-hat-side.jpg` and `ww-ash-hat-top.jpg` with prompt credits.
- Added `wren-flag`, with its rag traced and given 1 cm thickness and its pole
  lathed from the measured photo radius. Front and three-quarter exported-GLB
  renders match the rag outline and yellow knot. It does not read as a toy.
- Added `ww-wren-flag.jpg` with its prompt credit.
- The existing `photo_model.py` photo kit remains the source for the three
  Claude accepted props and the new box.
- `dynamite-box` was tried in two renders, then omitted. The photo wrapped into
  a collage and the recessed contents did not read; further changes did not
  improve it.
- `open-engine` was tried in two renders, then omitted. Cropping and aligning
  the views did not fix the broken overlapping surfaces; it still did not read
  as one engine. Its trial photos and geometry were removed.
- Added `regret-door` from the dead-on faded-red donor photo. Falcone F42 is the
  plainest classic coupe in the game; its GLB has one combined body shell, so
  the door was built from the photo with the real window opening and thin edge.
  The exported front and quarter renders match the reference and do not read as
  a toy.
- Added `ww-regret-door.jpg` and its prompt credit.
- `regret-bonnet` was tried in four exported-GLB renders, then omitted. The
  pale underside remained visible after cropping, changing thickness and
  remapping the edges. It did not pass the photo comparison.

## Checks

- Blender 4.5 recipe: rendered the exported GLB in an empty scene. It reports
- 19,916 triangles across seven props and the GLB is 1,796,328 bytes.
- Inspected `gerald-box` front and three-quarter renders, and `ash-hat` side and
  three-quarter renders beside their photos.
- `node tools/test-blender-output.mjs` and `node tools/test-repo-hygiene.mjs`:
  not yet run; run after the remaining props.
- Lane tier and build: not run; art cards use the specified Blender checks.

## Changed assertions

None.

## Race fingerprints

None: not wired into the game.

## Removed

The dynamite crate's failed photo crops were removed. Previously removed by
the accepted round 5: `ww-gerald-photo.jpg`, `ww-gerald-side.jpg`, the two
Gerald mask PNGs, earlier recipes, and round 4 sheet and note.
