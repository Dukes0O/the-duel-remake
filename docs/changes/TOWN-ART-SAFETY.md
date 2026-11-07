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

## Round 10: hydrant reel follow-up

### Changed

- Moved the hydrant reel beside the standpipe at waist height. Added a short welded bracket that touches the pipe, with a diagonal brace and fastening bolt.
- Rebuilt the reel around an X-axis lathed drum with two lathed side plates. Wound four rubber hose turns around the drum and moved the crank to the outer side.
- Kept the accepted standpipe and searchlight. Replaced the former rear-mounted reel, spokes and thin hoops.
- Added the hydrant's four reference-photo comparisons, two three-quarter renders and mayor view to `docs/board/looks/town-art-safety/round-10.jpg` (106,300 bytes). Full family GLB: 3,738,348 bytes. Hydrant: 1,744 triangles.

### Checks

- Blender family export, GLB readback, contact and footprint checks: **pass**. First two render attempts stopped at the 1,800-triangle cap (4,024 and 1,940); the final model is 1,744 triangles and rendered all seven views.
- `node tools/test-blender-output.mjs`: **pass**, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: **pass**; placement is valid and sizes are advisory.
- `node tools/test-review-evidence.mjs`: **7 passed, 2 failed**. Same-commit rerun: **7 passed, 2 failed**. Both runs report the unrelated missing Town Outposts round-15 note and `spawnSync ffmpeg EPERM` in audio analysis.
- Lane tier and build: not run, as required for art cards. Browser review: Claude to run.
- Changed assertions: replaced the old reel-side mesh assertion with required exported inner/outer side plates, drum, bracket and hose meshes; no assertion was loosened.
- Race fingerprints: not applicable to art-only work.

### Claude should inspect

- Compare the front, side and overhead rows with the reference photos, including the reel's screen-side and the orthographic camera match.
- Check that the bracket touches the pipe, the axle runs across the pipe, and the crank is on the outer side.
- Judge the four hose turns, plate wear and reel readability in the three-quarter and mayor views. The photo has more and tighter wraps.

### Removed

- Removed the old reel cylinder, spokes and thin hoop rims. Replaced their rear placement with the bracket-mounted, lathed drum and two side plates.

## Round 11: fences and walls

### Changed

- Generated four single-view, straight-on 8 m reference photos and added compressed copies under `public/assets/models/wasteland/town/textures/`, with credits in the town asset credits file.
- Replaced the old procedural stripe barriers with photo-traced slabs using `trace` and `slab`. The chain-link uses a see-through alpha texture on a thin traced sheet. Straight sections span 8 m; corners reuse the traced pieces in two half-cell arms; ends use the photographed terminal posts.
- Added the round 11 photo/model sheet and self-review. Full family GLB: **4,663,744 bytes**; sheet: **221,699 bytes**.
- Left the accepted gate, tower, posts, searchlight, fire station, clinic and hydrant recipes untouched. The existing Blender-output check already names all twelve barrier ids; no test assertion changed.

### Checks

- Blender export and review from the exported GLB: **pass**. All twelve barrier roots render. The straight edge values meet at 0 m; the corner's two axes meet at the shared post and are perpendicular. Family file is under the 8 MB limit.
- `tools/test-blender-output.mjs`: **377 checks passed; 0 failed** after reducing traced outlines and keeping the chain mesh in its alpha texture.
- `tools/test-repo-hygiene.mjs`: **passed**; size targets are advisory.
- `tools/test-review-evidence.mjs`: **8 passed, 1 failed** on both runs. The repeated failure is unrelated `spawnSync ffmpeg EPERM` in audio analysis.
- Lane tier and build: not run, as instructed for this art card. Browser and game look checks: Claude to run.
- Changed assertions: none. Race fingerprints: not applicable to this art-only change.

### Claude should inspect

- Check each photo against its straight model, especially the chain-link's see-through openings and the scrap wall's car panels and doors.
- Check that adjacent straight edges meet, the corner joins both straights at right angles, and the terminal post reads as an end.
- Judge the three-quarter and mayor views. No browser check was run.

### Removed

- Removed the procedural wood rails, chain strands and repeating wall plates from the four barrier families. Replaced them with the photo-traced parts; no accepted building was removed.
