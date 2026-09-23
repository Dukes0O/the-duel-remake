---
task: ART-A
status: partial
kind: art-intake
flag: none
player_facing: yes
---

## What changed

Added six exact-size runtime images: repeatable scrap plating and scrapyard
dirt, a transparent four-effect muzzle/dust atlas, and separate 64-frame
fire, explosion, and smoke atlases. The two
original, non-runtime studies remain under `public/assets/reference/`.
The full generation prompts, retained originals, local processing steps,
inspection results, and credits are in `docs/WASTELAND_ART.md` and the
texture and reference credit files. `tools/process-wasteland-art.py` is a
deterministic authoring helper. It adds no game dependency. No game code,
test thresholds, saves, or replay inputs changed.

## Intake and limits

The 2×2 study has real alpha and separate readable effects, but imagegen
returned 1254×1254 even after a built-in edit requested 1024×1024.
Following approval for deterministic local processing, each cell was split,
alpha-feathered at its edge, resized, and centered in a clear 512² cell.
The plating and dirt originals were resized to 1024² and their opposite
edges were blended across 96 pixels. Both have zero measured pixel mismatch
at the repeat boundaries, and both were visually inspected in 2×2 previews.
The large plate layout repeats visibly at tile scale, so integration review
should judge its in-game UV scale. The originals remain untouched outside
the repo.

The progression board has only four stages per effect on an opaque
background. It was not used to fill the new 8×8 atlases. Each flipbook came
from a separate generated 64-frame transparent original. Each of its cells
was cut using the same exact grid, tapered at its edge, resized to 240²,
and centered in a clear 256² cell. This kept the 64 original images in
order; no frames were duplicated. A deterministic alpha taper removed the
detached lower shadow in the smoke cells. Later explosion cells also taper
away their lower dust/reflection band and clear carryover from the previous
source row. The original RGB art and all source files remain unchanged.

## Verification

- Visually inspected 2×2 plating and dirt repeat previews and the dark
  backing preview for all four isolated muzzle/dust cells.
- Measured plating RGB edge differences before/after local repair:
  11.866/0.0 left-right and 11.383/0.0 top-bottom. Dirt: 25.759/0.0
  left-right and 23.798/0.0 top-bottom.
- The output muzzle/dust PNG is 1024² RGBA with no visible pixels on its
  outer border and at least 56.79% fully clear pixels per effect cell.
- The fire, explosion, and smoke PNGs are 2048² RGBA with exact 8×8 grids,
  clear outer borders, and minimum clear cell fractions of 47.19%, 28.29%,
  and 31.83%. Dark-background previews show the intended frame progression
  without a detached ground-shadow band. The Director independently
  inspected and approved the cleaned explosion and smoke previews.
- At alpha greater than 8 with more than ten visible pixels, fire has 55
  visibly occupied cells, explosion 49, and smoke 54. The remaining late
  cells are clear fade tails; playback timing should account for them.
- The two reference PNG copies still match their retained generated
  originals byte for byte by SHA-256.
- `node tools/check-art-intake.mjs --check`,
  `node tools/test-art-intake.mjs`, and `npm run build` are the focused
  checks for this lane. Their final results are recorded below.
- No browser or full test run was started during the separate release check.

## Final focused check results

- `node tools/check-art-intake.mjs --check`: passed. All seven planned
  Batch A items are present, with no missing file or failure. Total checked
  PNG bytes: 15,569,098 against the 32,000,000-byte budget.
- `node tools/test-art-intake.mjs`: passed.
- `npm run build`: passed with the existing large JavaScript chunk warning.
- `tools/process-wasteland-art.py`: syntax checked; each saved PNG was
  reopened and checked for exact size, color mode, and per-cell alpha.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8` expanded to
  176 tests. The first 36 started, with the completed checks passing; it
  was stopped to avoid a heavy parallel test load during the release tier.
  The lane gate therefore remains open for the integration window.
- `git diff --check`: passed.
