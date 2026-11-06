# WW-ART-DAM round 5

## Changed

- Cropped the baked face projection to the concrete span and mapped it crest to
  foot. Made the photographed piers shallow relief and placed the rail arch and
  sea gate on their photographed openings.
- Reused the game's crushed van, bus and RV shapes for twelve spillway wrecks.
  Removed the toy wheel-barrels and zigzag rock stubs.
- Put a dedicated wet salt photo on the filling-hall wall, added domed tank
  ends, and reduced the gatehouse to a low stone hut with a bracket lamp, door,
  bench and pad.
- Tilted and partly buried the old gear in a dark silt mound.
- Added the GLB-reimport review sheet at
  `docs/board/looks/ww-art-dam/round-5.jpg`.

## Checks and review

- Blender 4.5.13 LTS exported and reimported the GLB in an empty scene. Final
  readback: 48,158 triangles and 2,930,248 bytes; maximum `metallicFactor` is
  0.28. Both budgets pass (60,000 triangles, 3 MB).
- `node tools/test-blender-output.mjs`: 246 checks passed, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; no oversized look sheets.
- Python syntax check and `git diff --check`: passed.
- No browser check or game look check was run; Claude owns those checks.
- No race fingerprints were recorded; this art-only change does not change
  simulation code. No assertions changed.
- The first render attempts exposed a Blender material API issue, a missing
  Pillow module in Blender's Python, and a duplicate cleanup error. The
  material and cleanup issues were fixed. Sheet assembly used the installed
  system Python Pillow. Final Blender export and both card checks passed.

## Removed

- Removed the seven toy barrel-on-wheel spillway props and the zigzag rock
  shoulder meshes.

## Visual status

Round 5 is not a pass. The straight-on wall comparison is cleaner, but the
spillway cars still read upright from the review angle, and the wide view does
not make the dam feel like a real place. See the round 5 review note and sheet.
