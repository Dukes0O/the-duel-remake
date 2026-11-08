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

## Water front (final piece)

### Changed

- Added the `water-front` surge to
  `public/assets/models/wasteland/scablands/sea-water-front.glb`. It is one
  60 m segment with a steep muddy face, uneven forward-leaning crest, long back
  slope and crossed dirty spray cards at the crest and foot.
- Added the face and spray pictures in
  `public/assets/models/wasteland/scablands/textures/` and credited them in
  `CREDITS.md`. The recipe blends the face picture's edge bands in memory on
  both axes. The root exports `scrollV: 0.18` in picture-heights per second.
  A scene makes the face churn by offsetting only the surge material's V
  texture coordinate over time; it should leave U and the mesh unchanged.
- Added the recipe to `tools/test-blender-output.mjs` as a candidate with a
  20,000 triangle budget and a 2 MiB file limit. No previous sea asset was
  changed.
- Added three Standard-view look shots from the exported GLB and the round 9
  review sheet.

### Checks

- Blender export and GLB readback: passed; 11,040 triangles and 1,157,480 bytes.
- `node tools/test-blender-output.mjs`: passed, 368 checks, zero failures.
- `node tools/test-repo-hygiene.mjs`: passed.
- Browser and in-game checks: not run; Claude owns them for this art card.
- Changed assertions: none.
- Race fingerprints: not applicable; this art recipe does not change race code.

### Claude should review

- The 25 m and 80 m views for water readability, spray amount and segment joins.
- The profile view's steep leading face and long trailing slope.
- Whether a scene's V-only offset at `scrollV` makes the face churn as intended.

### Removed

- No existing model or source asset was removed or replaced.

## Merged with the card done

Gate on 9d03f886e: lane tier 47 of 47 and build passed. Pieces held for their scenes to check: the causeway and arch (SEA-WORKS, on the ground), Mrs Vane (SEA-JOBS-2, from its angles), the big magnet's lean, and the water front (SEA-FLOOD, moving, from its camera).
