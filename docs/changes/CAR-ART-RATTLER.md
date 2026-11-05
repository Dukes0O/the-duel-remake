# CAR-ART-RATTLER

## Changed

- Added a generated photographic rat-rod reference and a generated picture-based steel/rust material. Both full prompts are in `docs/WASTELAND_ART.md`; the texture is packed in the GLB and its credit is in the adjacent `CREDITS.md`.
- Rebuilt `tools/blender/rattler.py` with a curved cab shell and separate roof, slit windshield, short pickup bed, detailed V8 parts, game-style torus tyres with tread, overcast render lights and five requested views.
- Exported the Rattler model at 20,408 triangles and 7,803,604 bytes, within the card's 25,000 triangle and 8 MB limits.
- Added the photographic crop and five views to `docs/board/looks/car-art-rattler/round-3.jpg` (within the 500 KB sheet limit).
- The art does **not pass**. My side-by-side review still reads as toy-like: the cab looks like an oval cap rather than a shaped cab with open window apertures, the engine and nose overlap, and the generated texture stretches into broad streaks. I stopped after targeted silhouette, lighting and nose corrections failed to make the model resemble the reference. Claude should judge the round-3 sheet and use its review gaps to direct another round.

## Checks

- Blender recipe rendered all five views and exported the GLB successfully. The final export measured 20,408 triangles and 7,803,604 bytes.
- Blender output placement passed 232 checks in the lane tier. The lane command selected 48 suites; 46 passed. `tools/test-circuit-eifel.mjs` failed because FFmpeg loudness measurement failed, and its same-commit rerun failed the same way. `tools/test-review-evidence.mjs` failed because spawning FFmpeg returned `EPERM`, and its same-commit rerun failed the same way. No Eifel, audio or game code changed in this card. All selected suites reported; the runner did not exit after the suite results, so I interrupted it.
- `npm.cmd run build` passed. Vite reported the existing dynamic-import and large-chunk warnings.
- No browser checks or frame tests were run. Claude should inspect the five renders beside the reference crop in the round-3 sheet.
- No assertions changed. No race or game code changed; race fingerprints are not applicable to this model-only card.

## Removed

- Kept the round-2 sheet and review note as the earlier card round. Deleted round-3 temporary photo and render evidence after placing a crop on the review sheet and packing the material texture into the GLB.
- No source model, save, runtime file or unrelated asset was removed.
