# TOWN-ART-MACHINES-2 — round 10

## Changed

- Replaced only the front and rear mixer-truck reference photos. Both are credited to OpenAI ImageGen. The round 9 side, top and isolated drum photos remain in use.
- Limited the truck body carve to the frame-rail height. Added built rails, crossmembers, three axles, six leaf-spring assemblies, fuel and water tanks, bumpers, and six `tyre` meshes. Track width is measured from the new front photo; axle spacing remains measured from the retained side photo.
- Kept the drum as its own turning lathe and the chute as its own pivot. Added larger front and rear orthographic model views.
- Added the round 10 comparison sheet and review note.

## Checks

- Blender 4.5.13 candidate export and imported-GLB comparison renders completed.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** on the round 10 runtime GLB.
- Runtime family GLB: **4,148,756 bytes** (8 MB limit). Mixer truck: **12,700 triangles** (15,000 limit).
- The recipe printed bounds for the body and every named mixer piece. It reported contact neighbours for each non-wheel piece; all six tyre lower bounds are 0 m. The side render shows open ground between the three axle stations.
- `round-10.jpg`: **233,222 bytes** (500 KB limit).
- No test assertions changed. No gameplay code changed; no race fingerprints apply.
- Browser checks were not run in this art lane. Claude should judge the front/rear match and symmetry, the visible front/rear undercarriage, side-view tyre gaps and any remaining carve seams, top-view symmetry, the drum mount and the drum/chute work pose.

## Removed

- Replaced the round 9 front and rear JPEG contents and their descriptions in the credit file. No old front or rear photo copy remains in the texture folder.
- Replaced the photo-carved under-frame skirt with separate built chassis pieces.
- Replaced the round 9 runtime GLB with the round 10 mixer model.
