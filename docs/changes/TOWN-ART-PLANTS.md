# TOWN-ART-PLANTS

## Changed

- Added the first-piece Blender recipe for a portable quarry jaw crusher and exported `public/assets/models/wasteland/town/plants.glb`.
- Reused the town material helpers and the existing credited machine-wear, rusted tin, paint, rubber and earth pictures. Kept metallic factors below 0.3.
- Added the card output to `tools/test-blender-output.mjs` and checked the exported GLB and named crusher parts.
- Added the one-page 108,945-byte round 1 sheet and review note under `docs/board/looks/town-art-plants/`.

## Checks

- Blender 4.5.13 LTS: exported the GLB, imported it into a clean scene, and rendered above, driver-seat and side views. Inspected the comparison sheet.
- `node tools/test-blender-output.mjs`: passed, 275 checks.
- `node tools/test-repo-hygiene.mjs`: passed.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. The audio-analysis subtest failed twice because spawning `ffmpeg` returned `EPERM`; no game code changed between attempts.
- Browser and look verdict: Claude should compare the sheet with a crusher reference, inspect the disconnected/misaligned details, and decide whether the family proceeds. No browser check was run in this art lane.
- Changed assertions: none. Existing assertions and race fingerprints: unchanged.

## Limits

This is the requested first piece only. The rest of the family is not modeled, so this is not a complete or passing card. The generated photo reference could not be written to a local file by the available image tool; the sheet therefore lacks its reference crop and the recipe uses existing town material photos.

## Removed

- No existing recipe, asset or behavior was replaced.
