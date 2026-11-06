# WW-ART-CREW

## Changed

- Replaced the four tiled swatch textures with the harpoon, piano and lizard
  photographs, recorded their prompts in the existing texture credits, and
  removed the superseded swatches.
- Updated the recipe with a 16-sided harpoon shaft profile, raised rope bands,
  an iron socket, front and side photo projections for the piano, and a low
  12-station Gerald body with splayed five-toe feet. The harpoon photo receives
  a four-corner perspective transform.
- Rebuilt `crew-favours.glb` and the round 3 comparison sheet from the
  reimported GLB.

## Checks

- Blender export and GLB reimport: passed, 6,512 triangles, 1,051,696 bytes.
- Visual check: failed. All three still look toy-like beside their references;
  see `docs/board/looks/ww-art-crew/round-3-review.md`.
- `tools/test-blender-output.mjs`: passed, 258 checks; 0 failed.
- `tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- Self-look was run and failed; Claude still owns the art verdict. Browser check: not run.
- Changed assertions: none.
- Race fingerprints: not applicable; no race code changed.

## Removed

- Removed `ww-gerald-scales.jpg`, `ww-harpoon-iron.jpg`,
  `ww-harpoon-oak.jpg` and `ww-piano-veneer.jpg` and their credits.
- Removed the superseded round 2 sheet and review note; Git history retains them.
- No other model parts were added.
