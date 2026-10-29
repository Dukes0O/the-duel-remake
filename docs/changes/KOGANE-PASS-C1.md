# KOGANE-PASS-C1

## Changed

Added the packet's "C1 reference and reuse" section and linked it from the card.
Used built-in imagegen for reference-only pictures, saved outside the repo in
`C:/Users/kyleb/dev/art-library/kogane-pass/reference/`, with exact prompts and provenance.
The labelled contact sheet is 399,886 bytes. A byte-identical copy is in
Kyle's requested Claude scratchpad as `ref-kogane-pass.jpg`.

Checked existing kits and their LOD partners, textures, audio, course data and external nature/barrier sources. Marked reuse as fits, fits after change or new. Recorded the approved budgets and original-place descriptions with source links.

## Checks

Reference coverage and sheet-size audit passed. Generated pictures were visually
inspected. Claude still judges acceptance; this is not a new model look round.
- `node tools/run-tests.mjs --tier lane --changed --jobs 2`: PASS,
  13 suites, 0 failed, 0 not run, 304.99 s. Includes board (280 checks),
  placement, replay (225 checks), combat replay (12) and world composition (47).
- Production build: PASS, 599 modules, Vite build 1.23 s, using
  `npm.cmd run build -- --configLoader runner` from PowerShell.
  The initial plain `npm run build` could not find vite.cmd. A temporary
  lane-local launcher used the existing installed Vite, with no dependency
  install or shared-folder edits. The default config loader then tried to
  write into linked node_modules and was denied. Vite's runner loader kept
  the build in this lane. npm.cmd was needed to forward the loader option;
  earlier PowerShell npm invocations dropped it. No source or config changed.
  Existing dynamic-import and large-chunk warnings remain.
- `node tools/build-status.mjs`: refreshed this lane's STATUS. Other lane
  inspection was skipped and no live root supplied. This is not release evidence.
- Source/path, six-view coverage, image decoding, JPG cap and byte-identical
  scratchpad copies: PASS. `git diff --check`: PASS.
No browser or frame check applies. No save storage was used; no browser opened.
Race code and fingerprints are unchanged by this documentation-only change.

## Changed assertions

None. No tests or expected fingerprints changed.

## Removed

No existing file or asset replaced. Temporary packaging files and generated
build output are recycled after verification. No .evidence folder was created.

## Not done

Claude's reference acceptance. Later art, road, audio and model stages remain
with their own cards. No merge, push, release or integration/live-folder work.
