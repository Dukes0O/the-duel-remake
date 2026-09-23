---
task: ART-A
status: partial
kind: art-reference
flag: none
player_facing: no
---

## What changed

Added two original, non-runtime visual studies under `public/assets/reference/`:
fire/explosion/smoke progression and a transparent 2×2 muzzle/dust concept.
The full generation and edit prompts, source filenames, inspection results,
and credits are in `docs/WASTELAND_ART.md` and the reference credit file.
No game code, test thresholds, runtime textures, saves, or replay inputs
changed.

## Intake and limits

The 2×2 study has real alpha and separate readable effects, but imagegen
returned 1254×1254 even after a built-in edit requested 1024×1024. The
progression study has only four stages per effect on an opaque background.
Neither is named or loaded as a runtime sprite sheet. The earlier plating
and dirt studies likewise remain outside the runtime texture directory
because they miss exact size and seamless tiling requirements.

The Batch A runtime catalog therefore still lacks six required images.
Future final assets must pass exact dimensions, grid, transparency, prompt,
credit and byte-budget checks. The original outputs remain outside the repo.

## Verification

- Visually inspected the four-cell study and the 12-stage effects board.
- Decoded PNG pixels with `inspectPng`: the 2×2 study is 1254×1254 with
  61.86% clear alpha overall and at least 56.57% in each cell; the board is
  opaque 1942×809.
- SHA-256 confirms both repository copies match their retained generated
  originals byte for byte.
- `node tools/check-art-intake.mjs --check` passed with zero failures. It
  reports only the existing direction board as a present planned item and
  lists all six required runtime images as missing. The two extra reference
  studies are outside that runtime catalog; their pixels and provenance
  were inspected separately.
- `node tools/test-art-intake.mjs` passed. `npm run build` passed with only
  the existing large JavaScript chunk warning. No browser or full test run
  was started during the separate release check.
