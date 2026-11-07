# WW-ART-PEACE round 3

## Vehicle photo sources — incomplete work in progress

Generated and cropped four-view photo references for `sal-pipe-trailer`,
`dust-tanker` and `mirage-caravan`. Added the twelve JPEG sources to the town
texture folder and credited them. Each image is under 1024 px on its long side.

This does not complete the vehicle card. The Blender recipe has not yet been
extended, the vehicles have not been modeled or rendered, and no round-4 sheet
has been assembled. Claude should not review these photos as a finished round.

Checks run: `node tools/test-blender-output.mjs` passed (304 checks, 0 failed);
`node tools/test-repo-hygiene.mjs` passed. No test assertions changed. Race
fingerprints: not applicable; no simulation code changed. Browser and look
checks: not run here; Claude should judge the vehicles after the model and
round-4 sheet exist.

The requested `docs/ART_LINE.md` was not present in this checkout; the current
hull and photo method was read from the end of `docs/ASSET_PIPELINE.md`.

### Removed

- No files or behavior removed.

Date: 6 November 2026

Added the `toll-cabinet` root with a traced front photo, steel case and a real
projecting open-drawer box. The cabinet stands 1.8 m high. Its generated front
and side photos are compressed to JPGs in the town texture folder and credited.

Added the `bound-sign` root as a traced, thick board and a separate post. The
render keeps the three hand-painted lines right-reading and spelled exactly
`DO NOT DIG HERE`.

Added the `bound-stone` root, carved to 1 m from the front and side photos. Its
front carries a shallow crossed-tools mark with a smiley. The full-size JPGs are
kept as sources; only these new photos are downsampled in Blender for the GLB.

Added `mirage-decoy-tent` with a large painted front, a smaller offset rear
board and support poles hidden behind the painting. Its exported side view
shows both flat boards. The painting and exported front were compared at the
same size.

Added `mirage-decoy-oasis` with a traced thin tarp, four lifted corner folds,
stakes and guy lines. Its palm is hand-painted on the blue tarp. The overhead
photo was compared to the exported overhead render, and the car-height view
shows the full sheet from about 10 m away.

## Checks

- Blender export and GLB re-import/render succeeded. The front reference and
  exported front render were compared at matching size; the three-quarter view
  shows the open drawer as a box.
- `tools/test-blender-output.mjs` and `tools/test-repo-hygiene.mjs`: pending
  until all five requested props are in the candidate.
- Browser and in-game look checks: Claude should review the round-3 sheet after
  it is assembled. This art lane does not run Chrome.
- Added named-root and named-part assertions for the five new props to the
  existing Blender candidate check. No existing assertion was weakened or
  removed. Race fingerprints: not applicable; no race rules changed.

## Removed

- No files or behavior removed.

## Round 3

Five flat props pass; see `docs/board/looks/ww-art-peace/round-3-review.md`. Removed: nothing.
