# TOWN-ART-MACHINES-1

## Changed

- Replaced the shared atlas and FRACT/cell material mapping with
  `town.make_materials(texture_sources=...)` and `town.export_glb`.
- Added separate compressed JPG sources for worn steel, faded yellow-green
  paint and wet earth under the town texture asset folder. Materials own their
  repeating picture in the GLB. UVs map a 512 px tile to about 2 m.
- Kept machine roots, joint names, hinge centres and overall layout unchanged.
- Exported the family, then rendered the sheet only after importing that GLB
  into an empty Blender scene.
- Added a GLB readback assertion for one unique embedded JPEG per textured
  material and `metallicFactor` at or below 0.3.

## Checks

- Blender recipe export and reimport render: **passed**; GLB is 2,571,248 bytes.
- `node tools/test-blender-output.mjs`: **passed**, 242 checks; 0 failed.
- `node tools/test-repo-hygiene.mjs`: **passed**; repository placement passed.
- Browser, in-game look and frame checks: Claude's review; none run in this lane.
- Race fingerprints: not applicable; race code and simulation were not changed.

## Changed assertion

The prior GLB assertion required exactly one embedded image named as the wear
atlas. That no longer proves the required runtime behavior because glTF cannot
preserve the atlas cell math. It now follows every textured material to its
own unique JPEG image and verifies that every material stays at or below the
0.3 metallic limit. The 3 MB file limit and existing node, pivot and triangle
checks remain. This change tightens the proof around the per-material picture
contract; it does not loosen an existing limit. Claude should review it.
The generic candidate-size check now uses the entry's `maxBytes` when set;
TOWN-ART-MACHINES-1 declares 3,000,000 bytes, while candidates without an
override keep the existing 2,500,000 byte default. The first test run caught
that stale hardcoded cap and failed at 2,571,248 bytes; after this targeted
change the suite passed.

## Claude review requested

Use the checks in `round-3-review.md` to review the sheet and the model in the
game, with special attention to the Dig view and the dump load.

## Removed

- Removed the shared atlas construction and its cell-based UV assumptions.
- Removed round 1's sheet and review note.
- Removed the recipe texture inputs and original reference photo from
  `tools/blender/`; runtime JPGs and their credits now live under
  `public/assets/models/wasteland/town/textures/`, and the small photo crops
  remain on the round 3 sheet.
- Removed raw renders, intermediate PNGs, Blender output and test logs after
  review; only the card's model, texture JPGs and round 3 sheet remain.
