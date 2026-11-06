# CAR-ART-SCARAB, round 3

## Changed

Built the next Scarab art candidate from the accepted round-two stance and
proportions. Added embedded photo textures for oily rust and dirt-caked rubber
(with source images and prompts beside the model), clearer swept paddle faces,
four visible coil-over shocks, more seat and engine
detail, and dust on the lower links and skid plates. Added a daylight reference
crop beside the five Blender views in the contact sheet.

## Checks

- Blender 4.5.13 LTS model and five-view render: passed. Export is 24,570
  triangles and 1,773,568 bytes; limit is 25,000 triangles and 8 MB.
- After placing the source textures beside the model, rebuilt the GLB and reran
  `node tools/test-blender-output.mjs`: 233 checks passed, 0 failed. A final
  `npm.cmd run build` also passed.
- `node tools/test-board.mjs`: 341 checks passed. `node
  tools/test-repo-hygiene.mjs`: passed; size reports are advisory.
- Lane tier: ran with `node tools/run-tests.mjs --tier lane --changed --jobs 4
  --keep-going`. Blender output placement passed 233 checks. The gate did not
  finish green: `test-circuit-eifel.mjs` failed its FFmpeg loudness step with
  `spawnSync ffmpeg EPERM`; one isolated rerun failed the same way.
  `test-review-evidence.mjs` failed because its retained-size check still stats
  the round-one sheet that the card says to remove, and its audio subtest also
  hit `spawnSync ffmpeg EPERM`. Its isolated rerun reproduced both failures.
  No tests or assertions were changed. The round-one expectation needs a
  Director decision before that suite can pass while following the card.
- Build: `npm.cmd run build` passed. Vite reported its existing dynamic-import
  and large-chunk warnings. Plain `npm run build` was blocked by PowerShell's
  script policy, so the `.cmd` entry point was used.
- Browser check: not run. Claude owns browser and in-game look checks for this
  art card. The round-three sheet and review points are in
  `docs/board/looks/car-art-scarab/round-3-review.md`.
- Changed assertions: none.
- Race fingerprints: none; this art-only card does not change race behavior.

## Removed

- Remove the superseded round-one sheet and review note as required by the card.
- The superseded clean procedural tire noise is no longer used for the Scarab;
  the generated rubber texture replaces it.
