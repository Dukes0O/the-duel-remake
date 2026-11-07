# TOWN-ART-POWER round 3

## Design choices

- Use measured photo shapes for the windmill, pole, generator, solar rack and fuel depot. This is the final submission round allowed by the card.
- Pack the family into one 1024 x 1024 texture atlas. Keep each building within its listed triangle budget and the GLB under 3 MB.
- Keep the generator sheltered, with two roof panels and a center opening so the engine reads from the mayor's overhead view. Keep the soot stain on a roof panel.
- Map the full measured pole-photo width around the pole and move the transformer clear of the post. This fixes the narrow-strip UV mapping that made the wood look striped.
- Use generated images only as photo references and textures. Keep the models' own silhouettes and construction readable.

## Changed

- Completed round 3 models for the windmill, power pole, generator, solar rack and fuel depot in `power.glb`, with one packed 1024 x 1024 atlas.
- Added the shelter roof opening, photo-shaped parts and atlas checks described above.
- Simplified traced photo contours to meet the existing triangle budgets, kept one anchor bolt per mast foot plate, and increased the pole's top offset to show its lean.
- The independent visual review did not accept the result. The round 3 sheet is the card's third submitted round; no fourth round is allowed by this card.

## Checks and review

- `tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- `tools/test-board.mjs`: passed, 680 checks. `node tools/build-status.mjs` updated `docs/board/STATUS.md`; it reports the full tier stale for the lane's source commit.
- `tools/test-review-evidence.mjs`: 8 of 9 subtests passed. The unrelated audio-analysis subtest could not launch `ffmpeg` (`spawnSync ffmpeg EPERM`).
- `tools/test-blender-output.mjs`: passed, 296 checks, 0 failed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: stopped at `tools/test-circuit-eifel.mjs`; 12 suites passed, 1 failed, 34 not run. The failure is an unrelated FFmpeg loudness measurement error. One same-source rerun of `node tools/test-circuit-eifel.mjs` failed at the same measurement.
- `npm run build` was blocked by PowerShell's script policy; `npm.cmd run build` passed.
- Independent code review found no concrete issue in the Blender recipe, atlas packing, output assertions, budgets or ownership.
- Independent visual review: not accepted. The windmill is cropped; the generator's shelter, soot stain and fuel drums are unclear; the rack reads as four matching panels; and the depot's pump, pipework, valves and bund are unclear. See `round-3-review.md`.
- No browser or frame check applies because this model is not wired into the game. Race fingerprints are not applicable; art only.
- Changed assertions: the output check now applies each building's own triangle budget and the summed budget, and checks that the exported GLB embeds one 1024 x 1024 image used by its materials. These checks do not raise the per-building limits.

## Removed

- Replaced the round 2 recipe, GLB and test scope in place. Earlier round sheets and reviews remain as submitted evidence.
