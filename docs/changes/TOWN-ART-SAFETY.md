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
