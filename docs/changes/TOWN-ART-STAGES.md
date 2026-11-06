# TOWN-ART-STAGES round 3

## Changed

- Rebuilt only `scaffold-2` in `tools/blender/town-stages.py`. Added a rectangular `beam(a, b, width, depth, material)` helper and used it for solid timber and steel members with the card's metre dimensions. The scaffold has four corner posts and four supporting mid-bay posts on concrete blocks, floors at 3 m and 6 m, full plank decks with 25 cm boards and gaps, X braces, a real ladder, pulley hoist, rope, bucket, half-clad tin wall, a leaning panel and ground salvage.
- Removed the model's ground plate. The dirt plane exists only in the render scene and is not exported.
- Replaced the atlas material path with four individual repeating photo JPEGs: weathered timber, dark rusted steel, rusted tin and rubble. Material variants keep the scaffold members distinct. Metallic factors stay at or below 0.3.
- Packed and compressed the family GLB at 1,681,808 bytes and 52,776 triangles. The family remains under its 3 MB and 60,000-triangle limits.
- Added `round-3.jpg` with the generated photo, low 1.7 m view and 45-degree mayor view at 60 m. Both model views were rendered from the exported GLB imported into an empty Blender scene. The source photo remains outside the repository. Added its prompts and credits beside the runtime textures.
- Other ids stay as they are for now.

## Checks

- Blender recipe, GLB export and both render views: passed. Render inspected against the photo before making the sheet.
- `node tools/test-blender-output.mjs`: passed, 238 checks; the GLB size, triangle budget and required ids pass.
- `node tools/test-repo-hygiene.mjs`: passed. Reported size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 8/9 passed. The audio analysis check failed on the known `spawnSync ffmpeg EPERM`; no rerun was made.
- Browser and game look checks: not run in this lane. Claude should check low-view member thickness, timber/tin color, ground clutter readability and the mayor camera framing.
- Changed assertions: none. No race or simulation code changed; race fingerprints are unchanged.

## Removed

- Removed the shared atlas from this recipe and the prior round's scaffold texture use. The four separate JPEGs now supply the model materials.
- Removed the previous round 2-over-budget GLB by replacing it with the current export; no backup copy was kept.
- No other family id, runtime code or player data was removed.
