# CAR-ART-RATTLER

## Changed

- Reworked the Rattler recipe around a low, long pickup stance: slimmer chassis rails, a folded grille surround with separate bars, a framed side window, pressed door ribs, and tread lugs built into each tire.
- Added generated photographs for dark body steel and ground dust. The dust texture sits on the lower cab hem; every generated image and its full prompt are credited in `docs/WASTELAND_ART.md` and `public/assets/models/wasteland/cars/CREDITS.md`.
- Normalized mesh UV layer names to `UVMap`. The recipe now checks the exported GLB for only `TEXCOORD_0`, non-flat coordinates, and metallic factors at or below 0.3.
- Rendered the five-view sheet by importing `rattler.glb` into an empty Blender scene. The sheet includes a crop of the round-four photo reference and is 219,755 bytes.
- The GLB measures 23,582 triangles and 2,668,400 bytes. Its intended envelope is 4.52 m long, 2.12 m wide and 2.08 m high; rear and front tire radii are 0.54 m and 0.45 m.
- Round four is ready for Claude's look review. The front three-quarter view shows the requested engine, grille, chassis and lugs. The broad lower cab panels, simplified engine shapes and blocky tread still look more stylized than the photo; Claude should judge whether those gaps need another art round.

## Checks

- `blender -b -t 4 --python-exit-code 1 --python tools/blender/rattler.py -- --root .`: passed; exported the model, checked the GLB UVs and metallic factors, and rendered all five views from the re-imported GLB.
- `node tools/test-blender-output.mjs`: passed, 232 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. Existing size targets are advisory; no oversized look sheets were reported.
- No browser or game look check was run. Claude should review the photo against the front three-quarter view, then check the rear, side, top and beside-person views for proportions, panel shape, dust placement, grille and tire tread.
- No test assertions changed. No race or game code changed; race fingerprints are not applicable.

## Removed

- Replaced the old note that said the card was blocked by a three-round cap. This follow-up completes the requested round-four handoff.
- No source model, save, runtime path or unrelated asset was removed. Temporary renders, logs and the generated photo source were used for the sheet and are removed from the lane before commit.
