# BOWL-ART-REX: Scrapasaurus round 1

## What changed

- Added `tools/blender/bowl-scrapasaurus.py`, a repeatable Blender recipe for a two-storey welded scrap dinosaur on a rail bogie. It has separate jaw and tail nodes, three battery boxes with whole and smashed states, and review views.
- Added the candidate recipe and GLB budget check to `tools/test-blender-output.mjs`. The candidate GLB stays optional in the shared suite until a scene card wires it into gameplay.
- Rendered one review sheet at `docs/board/looks/bowl-art-rex/round-1.jpg` (78,465 bytes; limit 500,000). Scores and Claude's review requests are in the round note.
- The generated GLB measured 16,596 triangles and 1,410,100 bytes (limits 60,000 and 2,500,000). It was read back by the Blender-output suite. The card says gameplay wiring belongs to WW-SCENE or BOWL-COURSE, so the generated GLB and editable `.blend` are not part of this commit.

## Checks

- Blender 4.5.13 LTS: one successful round, four views rendered, GLB exported. An initial startup attempt stopped before rendering because the empty scene had no world; the recipe now creates one. No additional art round was made.
- `node tools/test-blender-output.mjs`: **193 checks passed, 0 failed**, including the generated GLB triangle and size readback.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): **45 suites passed, 2 failed, 0 not run**. Re-ran both failures once on the same code. `test-circuit-eifel.mjs` failed again because FFmpeg loudness measurement could not start. `test-review-evidence.mjs` failed again on an existing crew evidence date-folder mismatch and `spawnSync ffmpeg EPERM`. Neither failure touches this card's files.
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and large-chunk warnings.
- Browser scenario and in-game look check: Claude runs from the compact sheet. No browser QA or frame check was run in this art lane.
- Changed assertions: no existing assertions changed. Added an optional candidate-GLB budget check for this recipe.
- Race fingerprints: none; this art-only change does not change race code.

## Removed

- Removed the generated public GLB and editable Blender file after their local output checks. The model is not wired into gameplay in this card. The four raw renders remain in the ignored `.evidence/2026-11-05/BOWL-ART-REX/round-1/` folder for review.
- No existing recipe, model or behavior was replaced.
