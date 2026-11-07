# WW-ART-SEA

## Changed

- Added `magnus-magnet-big` to `sea-magnet-big.glb` as its own root, with the
  reused carved crane body, doubled 26 m boom, taut cables, oversized magnet,
  traced timber packing and four traced screw-jack props.
- Added two generated prop photographs and their credits. Added round 8's
  four-view comparison sheet and review.
- Added the new recipe to the Blender output candidate list, with 30,000
  triangles and a 2.5 MB limit.
- Added a render-coordinate lesson to `docs/ART_LINE.md` after correcting the
  first camera setup.

## Checks

- Blender recipe export: passed. GLB readback: 18,172 triangles, 2,387,424
  bytes, one root named `magnus-magnet-big`.
- `node tools/test-blender-output.mjs`: passed, 364 checks, zero failures.
- `node tools/test-repo-hygiene.mjs`: passed.
- Rendered and inspected four Standard-view shots from the exported GLB.
- Browser check: not run; Claude owns browser and look review for this art card.
- Changed assertions: none.
- Race fingerprints: not applicable; no game or race code changed.

## Claude should review

- Whether the whole crane shots make the oversized magnet and doubled boom feel
  unstable enough, and whether the supports sell the joke.
- Whether the close-up clearly shows the props, timber packing and sunk tracks.
- The size comparison beside `magnus-crane`.

## Removed

- No existing model or source asset was removed.

## Magnus's big magnet, corrected by Claude

`magnus-magnet-big` lives in `sea-magnet-big.glb`. The magnet hangs straight under the boom's tip; the body sinks 0.3 m; the root leans 3 degrees towards the load, recorded as `lean_degrees` on it.

### Removed

Nothing replaced by this piece.
