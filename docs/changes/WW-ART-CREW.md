# WW-ART-CREW round 5 candidate

## Changed

- Inset harpoon ring UVs by 0.86 around each column centre, including the barb section.
- Mirrored the piano geometry so the side strip appears on the viewer's left. Replaced the separate photo slabs with a measured photo-kit silhouette shell. Added front-left and front-right three-quarter renders.
- Replaced Gerald's flat relief with a 40-station, 12-sided body using overhead and side photo UVs, plus 14 mm bent leg slabs traced from the green cutout masks. The masks retain the whole tail and toes and contain no shadow. The model uses the original photo pixels for color.
- Exported from the recipe and rendered all views from a fresh GLB import. Final export: 6,614 triangles; 1,646,564 bytes.

## Checks

- Blender 4.5 rebuild and reimported renders: completed.
- `node tools/test-blender-output.mjs`: passed, 279 checks.
- `node tools/test-repo-hygiene.mjs`: passed; existing size advisories only.
- Browser checks: not run; they are Claude's.
- Changed assertions: none. Race fingerprints: not applicable.

## Visual verdict

This candidate does not meet the card's look acceptance and is not submitted as round 5. The harpoon still shows a pale edge at the barb. The piano's angled views still show pale photo areas around its silhouette. Gerald has more body height, but its legs and overall shape do not yet read as a convincing lizard. Do not treat any of the three as a pass. No round-5 comparison sheet was made; round 4 remains the latest submitted sheet.

Claude should review the current exported model and render recipe before deciding the next art pass.

## Removed

- Replaced Gerald's round-4 overhead relief and the piano's separate slabs in the current recipe.
- Removed round-5 generated cutout previews, render captures, test logs and the temporary Blender file after review.
- No other props or assets were changed.
