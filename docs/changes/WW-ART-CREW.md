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
- The existing `photo_model.py` photo kit remains the source for the three
  Claude accepted props and the new box.
- `dynamite-box` was tried in two renders, then omitted. The photo wrapped into
  a collage and the recessed contents did not read; further changes did not
  improve it.

## Checks

- Blender 4.5 recipe: rendered the exported GLB in an empty scene. It reports
  6,816 triangles across the four props and the GLB is 1,279,820 bytes.
- Inspected `gerald-box` front and three-quarter renders beside its photo.
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
