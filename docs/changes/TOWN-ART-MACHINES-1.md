# TOWN-ART-MACHINES-1

## Design

Built a private family GLB with a trencher, excavator, six-wheel dump truck and tracked dozer. The models use named, nested moving parts and a single embedded 1K wear atlas. Each render pair shows a rest and working pose against a crop of the generated photographic reference. Blender's Z-up scene exports glTF Y-up.

The card says these models are not wired into the game. The task instruction says to commit generated models only when the card says the game loads them now, so the model was built under ignored `.qa-dist/` for readback and review, then removed and omitted from this commit. The recipe can produce the card's listed public path later when a wiring card needs it.

## Checks

- Blender recipe completed and rendered eight rest/work views. Private candidate readback: 1,960,024 bytes; 7,224 trencher, 6,196 excavator, 7,717 dump truck and 6,076 dozer triangles; one embedded JPEG atlas.
- `node tools/test-blender-output.mjs`: passed, 238 checks; the family and per-machine readback assertions passed.
- `node tools/test-repo-hygiene.mjs`: passed. Existing advisory size reports remain unchanged.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. The audio-analysis subtest failed because it could not start `ffmpeg` (`spawnSync ffmpeg EPERM`). The required same-commit rerun reproduced it. It is unrelated to this card.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 24 of 25 suites passed. `tools/test-review-evidence.mjs` had the same `ffmpeg EPERM`; its other 24 selected suites passed, including Blender output, world composition and 297 replay fingerprint checks.
- `npm run build` (run as `npm.cmd run build` because the PowerShell wrapper was blocked): passed. Vite reported its existing dynamic import and large chunk warnings.
- Browser and game look checks: Claude's review; not run in this lane.
- Changed assertions: added candidate readback checks for the single family root, four direct machine roots, named pivots, one embedded atlas, the 3 MB file limit and 15,000 triangle per-machine limits. No existing assertions were loosened.
- Race fingerprints: no race code changed. The lane replay checks passed all 297 fingerprints.

## Claude should review

Review `docs/board/looks/town-art-machines-1/round-1.jpg` and its score notes. Focus on the repeated track shoes, simplified cab proportions, and whether each joint reads as a machine pivot. No browser check or frame check is needed for this art-only card.

## Removed

The reference image and painted steel source stay outside the repository. Raw renders, the private candidate GLB, Blender file, and test/build logs were removed from ignored `.evidence/`, `.qa-dist/`, `art-build/`, and `dist/` after checks. No existing asset or recipe was replaced.
