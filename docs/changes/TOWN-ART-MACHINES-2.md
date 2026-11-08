# TOWN-ART-MACHINES-2 — round 11

## Changed

- Updated only the mixer truck: dark 0.30 m rubber treads, paired tyres on both rear axles, cubic photo sampling at the carved projection joins, and an overhead comparison render scaled to the reference photo.
- Added the round 11 review sheet and visual review note.

## Checks

- `node tools/test-blender-output.mjs`: 389 passed, 0 failed; complete run.
- Blender 4.5.13 exported and rendered the imported GLB. Family: 4,197,144 bytes. Mixer truck: 13,724 triangles. Ten tyres meet the ground.
- No browser check in this art lane; see Claude's visual review list in the review note.
- No assertions changed. No gameplay changes; race fingerprints do not apply.

## Removed

- Removed this round's temporary render images, Blender logs and sheet-generation helper from `.qa-dist` after making the review sheet.
- No round 10 model parts or photos were removed.
