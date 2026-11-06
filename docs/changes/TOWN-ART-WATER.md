# TOWN-ART-WATER

## Design

Round 3 uses the card's six original water buildings and the shared town
material helpers. The raised tower must read as a braced timber structure from
the mayor view, with a riveted tank, three fill markers and a reachable ladder.
The treatment works show four linked stages from brown settling water through
filter sand and a boiler to the covered clean-water tank. The exported GLB is
the source for every review image, so the sheet checks the same materials and
axis conversion the game receives. Preserve the card's named moving parts and
footprints.

## Checks and evidence

- Round 3 rebuilt the Blender source and GLB. The exported family is
  2,048,140 bytes and 26,596 triangles. The six per-building budgets, embedded
  image checks and overall file budget pass. The compressed review sheet is
  277,042 bytes.
- `node tools/test-blender-output.mjs`: 251 checks passed.
- `node tools/test-repo-hygiene.mjs`: passed. Existing size targets remain
  advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests pass, on both runs.
  The audio-analysis subtest cannot launch `ffmpeg` (`spawnSync ffmpeg EPERM`).
  The review JPG publication check passes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: stopped at
  `tools/test-audio.mjs`; it reports that eleven runtime recordings did not
  load. The broad pre-existing worktree changes selected 507 suites, so the
  lane did not reach the town checks. No audio runtime code or audio tests were
  changed by this card; the worktree has unrelated staged runtime audio files.
- `npm.cmd run build`: passed. Vite reported its existing large-chunk and
  ineffective dynamic-import warnings.
- No race or game code changes; replay fingerprints and browser checks do not
  apply. No frame timing is required for art.
- No test assertions or tolerances are changed.

The recipe currently reads five source photos from
`public/assets/models/wasteland/town/textures/`. Those new files are source
inputs, not runtime files. Their path must be settled before this card can
integrate; see the pending scope question. The lane tier and review-evidence
suite also remain red for the unrelated failures above.

## Removed

- Superseded round 1 and round 2 remain as iteration evidence; round 3 is the
  current submission. Raw Blender renders and the `.blend` are temporary
  review evidence and stay until the look verdict is recorded.
- No current player asset or save data is removed.
