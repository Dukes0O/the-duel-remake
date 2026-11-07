# TOWN-ART-FOOD: shopfront round 16

Task: TOWN-ART-FOOD
Status: acceptance review passed; Claude art verdict pending. Lane tier is
blocked by an unrelated FFmpeg loudness-measurement failure.
Kind: art
Flag: none; this family is not wired into the game in this card.

## Design

- **Codex decided (Claude to review):** keep the road-facing sign and add a
  weathered roof label over the ridge. The card requires the shop names to read
  from above and from the road. Round 15 showed that its vertical signs were
  not readable from the mayor view.
- Use the same ochre lettering and weathered plank for both labels. The roof
  sign runs along the ridge and sits within the 1 by 1 plot.
- Count evaluated Blender geometry so bevel modifiers are included. The first
  roof-sign export added 192 triangles per shop after export; removing bevels
  from its board and supports leaves each shop within the 1,800 cap.

## Review

The 1500×3300 round sheet is 277,691 bytes. It compares the side, front, rear
and roof plan with their references, then shows all three roofs from 60 m at
45 degrees down and the other two road signs. The camera uses an 85 mm lens to
show the town view at useful size; the road board still reads in the front
view.

Codex self-review: silhouette/proportions 4/5, material resemblance 4/5,
grounding 4/5, town-scale readability 4/5. The exported shop counts are 1,688,
1,784 and 1,428 triangles. Largest differences remain the reversed door/window
order in the side match, flatter roof corrugation and clean font. The roof
placard is a simple handmade board with exposed supports.

## Checks

- Blender 4.5 export completed. `food.glb` is 2,728,120 bytes.
- `node tools/test-blender-output.mjs`: passed, 377 checks.
- `node tools/test-repo-hygiene.mjs`: passed; placement passed and size targets
  remain advisory.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. The audio
  analysis test could not start `ffmpeg` (`spawnSync ffmpeg EPERM`); the same
  failure repeated on its one rerun.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 13 suites passed,
  then `tools/test-circuit-eifel.mjs` failed at FFmpeg loudness measurement.
  Its standalone rerun passed 17 of 18 tests and failed at the same measurement;
  the remaining 33 suites did not run.
- `npm.cmd run build`: passed. PowerShell blocked the `npm` wrapper by execution
  policy, so the Windows command entry point was used.
- Added readback assertions for both roof-facing and road-facing lettering on
  all three shops. No assertion was loosened.
- No game or browser check, frame timing or race fingerprint applies; this
  model is not wired into the game here.

## Removed

- Removed the procedural box-built shopfronts and their board and counter
  geometry; the photo-carved shells replace them.
- Removed the superseded round-14 greenhouse-only change note. Its verdict is
  recorded beside the round-14 comparison sheet.
