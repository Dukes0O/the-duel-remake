# CAR-ART-RATTLER — round 5

## Changed

- Merged `integration/wasteland` into this lane; resolved the shared car texture credits by preserving both the Rattler and Scarab entries.
- Kept the Rattler chassis, engine layout, stance, vehicle id, wheel dimensions and socket names. Replaced the open cab parts with a closed formed shell, removed the old floating window frames and separate roof, added low side-window insets and door seams, softened the tire shoulders, and added thin front mudguards on stays.
- Updated the first review camera to fit the truck and set the studio field to grey. The recipe exports and reimports the GLB before making its five review views.
- Added the round-five sheet and review. The sheet is 130,037 bytes. It includes the generated photo reference crop from round four next to the new render.
- The final GLB has 22,442 triangles and is 2,287,640 bytes. The recipe checks for only `TEXCOORD_0` on each primitive, a non-flat UV range, and metallic factors at or below 0.3.

## Checks

- `blender -b -t 4 --python-exit-code 1 --python tools/blender/rattler.py -- --root .`: passed; built the GLB and rendered five views from its reimport.
- `node tools/test-blender-output.mjs`: passed, 257 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; no oversized look sheets. Size targets are advisory.
- No browser or game look check was run. Claude should compare the reference crop and front view, then inspect the rear bed, side windows, tire tread, front guards, top view and scale view.
- No test assertions changed. No race or game code changed; race fingerprints are not applicable.

## Remaining visual gaps

This is a round-five candidate, not an accepted final. In the sheet, the cab's side window and door shape remain simpler than the photo, the body texture still reads mottled instead of showing clear vertical rust streaks, and the tire face still has a ripple pattern. Claude should decide whether another round can close those gaps before the six-round limit.

## Removed

- Deleted round-two and round-three sheets and reviews, keeping round four for comparison.
- Removed the old cab panels, separate roof, floating window framing and old glazing from the exported model.
- No save, runtime path or unrelated asset was removed. Temporary renders, logs and sheet-assembly scratch code are removed before commit.
