# TOWN-ART-HOMES

Status: work complete in lane; merge pending. Kind: art asset.

## Delivered

- Blender recipe for two canvas tents, three distinct tin shacks, two scaffold stacks, two container blocks, and the brick-and-steel terrace.
- Each model has a named child and emissive lamp under `town-homes`. Recipe assertions keep every mesh at least 0.5 m inside its assigned plot.
- One embedded 1K wear atlas. The final GLB is 1,438,704 bytes and 16,580 triangles, below the 3 MB family limit and the per-home budgets.
- Round 3 passes visual review in [round-3-review.md](../board/looks/town-art-homes/round-3-review.md). Its 358,384-byte sheet is [round-3.jpg](../board/looks/town-art-homes/round-3.jpg). Rounds 1 and 2 document the iteration.
- The tin reference is stored as text in `tools/blender/town-homes-tin.jpg.b64`. The recipe decodes it into ignored `.qa-dist/` before building. The source JPEG was removed to the Recycle Bin after verifying the encoded copy.

## Checks

- Blender recipe: rebuilt the GLB from the encoded source; all plot-clearance assertions passed.
- `node tools/test-blender-output.mjs`: 238 checks passed, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed, including the bounded review-sheet publisher. The audio-analysis subtest could not start `ffmpeg` (`EPERM`).
- `npm.cmd run build`: passed. Vite reported existing large-chunk and ineffective-dynamic-import warnings.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 14 suites passed, then `tools/test-circuit-eifel.mjs` failed at its FFmpeg loudness measurement (`EPERM`); 32 later suites did not run. Running that Eifel suite alone reproduced the same tool failure, while its other 17 checks passed.
- `git diff --check`: passed. No assertions were weakened.

The FFmpeg failures are outside this art card. They remain a test-tool issue; they do not change the GLB or review-sheet results.

## Removed

- Replaced the raw `tools/blender/town-homes-tin.jpg` source with its text-encoded recipe input. No old model or runtime path was retained.
