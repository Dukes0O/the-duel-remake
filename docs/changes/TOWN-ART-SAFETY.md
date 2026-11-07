# TOWN-ART-SAFETY — gate-scrap follow-up

## Changed

- Replaced the small box-and-plank leaf with a full-width moving node named `gate-scrap:door`, photo-traced from front and rear views with steel thickness. The hinge sits at the inner edge of the left tower.
- Rebuilt the two towers and lintel from traced photo masks and slabs. Separate front and rear lattice faces, connected with depth ties, keep the tower openings visible while giving the frames real depth.
- Added four generated orthographic photo references under `public/assets/models/wasteland/town/textures/`: side, front, rear and straight-down. Each is a JPEG at most 1024 pixels wide. Built-in image generation credit: OpenAI image generation, 7 November 2026; each view was generated as its own image. The first side prompt returned a front-like angle, so it was replaced with an explicit end-on side view.
- Created `docs/board/looks/town-art-safety/round-8.jpg` and its review note. Earlier sheets and passed buildings are unchanged.
- Added the `ART_LINE.md` fault note that a view label can be ignored by the image generator; verify the silhouette before tracing.

## Checks

- Blender recipe export and GLB readback: **pass**. Each gate mesh printed bounds; the contact check confirmed ground or adjoining-piece contact inside the 2 by 1 footprint. The review sheet is under 500 KB.
- `node tools/test-blender-output.mjs`: **pass**, 377 checks, 0 failures.
- Lane tier and build: not run, as required for art cards.
- Browser check: Claude runs. Please inspect the side silhouette, tower depth, photo/model scale, leaf clearance under the lintel, and opening swing in the supplied renders.
- Changed assertions: none. Race fingerprints: not applicable to this art-only change.

## Removed

- Removed the obsolete gate facade photo overlay and the old duplicate planks and car-door boxes from the gate recipe.

## Round 9: searchlight and hydrant

### Changed

- Added a baked faded-red hydrant enamel texture from the existing oxide texture.
- Replaced thin reel rings with a continuous thick rubber hose coil. Simplified the coil mesh and reel rims to keep the hydrant below 1,800 triangles.
- Added an exported-node assertion for the named hose mesh.
- Added credits for the hydrant orthographic references and the baked enamel texture.
- Added the matched Round 9 contact sheet and self-review. The candidate awaits Claude's art verdict.

### Checks

- Blender recipe export and GLB readback: **pass**. Searchlight: 720 triangles; hydrant: 1,696 triangles. The Round 9 sheet is 181,738 bytes.
- `tools/test-blender-output.mjs`: **pass**, 377 checks, 0 failures.
- `tools/test-repo-hygiene.mjs`: **pass**; size targets are advisory.
- `npm.cmd run build`: **pass**.
- Lane tier (`--changed --jobs 4`): **13 passed, 1 failed, 33 not run**. The unrelated Eifel circuit suite failed its FFmpeg loudness measurement on the lane run and on one same-commit rerun; no art assertion failed.
- `tools/test-review-evidence.mjs`: **7 passed, 2 failed** on two runs. The failures are an unrelated missing Round 15 Town Outposts review note and `spawnSync ffmpeg EPERM` in audio analysis.
- Changed assertions: added one named-mesh check; no assertion was loosened.
- Race fingerprints: not applicable to art-only work.

### Removed

- Removed the three thin torus rings that read as bare wire, replacing them with the continuous hose mesh.
