# WW-ART-RAIL

## Changed

- Added side, front and rear photo-mask generation to the rail recipe. It saves inspectable mask PNGs under `.qa-dist/masks/` and prints projected background corner shares plus the worst ten source parts.
- Added nearest-mask UV correction for projected photo corners, recalculated outward mesh normals, and set the fresh imported-GLB render to Standard.
- Replaced the round 1 look sheet and review note with the round 2 sheet and review note.

## Checks

- Blender recipe: completed on Blender 4.5.13. Exported GLB: 1,296,752 bytes; 13,996 triangles total (11,500 engine, 2,496 drift).
- Photo background corner shares after UV correction: side 18.33%, front 22.81%, rear 35.02%. Target is below 1% for each; failed.
- `node tools/test-blender-output.mjs`: passed, 275 checks; 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Existing advisory size targets remain over target for total public bytes and look-directory bytes; no placement check failed.
- Browser and look check: not run here. Claude should inspect round 2 sheet, especially pale faces around the cab roof, chimney, smokebox, wheels and track.
- Changed assertions: none.
- Race fingerprints: not applicable to this art card.

## Not complete

This round does not meet the card's requested mask-traced slabs, mask-derived lathe profiles, corrected front/rear face assignment and smokebox door, curved photo-derived roof, or wind-shaped drift. The rendered engine remains visibly assembled and does not yet read as a real dead locomotive from three-quarter views. I stopped this round after the mask projection change did not bring the background shares close to the 1% target. This needs another art pass before approval.

## Removed

- Removed the round 1 look sheet and review note, replaced by round 2.
- No source photos or generated textures were removed.
