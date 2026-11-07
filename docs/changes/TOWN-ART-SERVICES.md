# TOWN-ART-SERVICES — trading post round 9

## Changed

- Kept the accepted trading-post store body and photo references unchanged.
- Rebuilt the porch as a 10 m wide, 2.5 m deep deck against the store's front wall, with a sloped roof from the eave to outer posts.
- Moved hand-painted TRADING POST lettering onto a road-facing sign board above the porch roof edge.
- Added separate crates, drums and tyres on the deck and beside it on the ground.
- Printed bounds and checked the plot and ground/contact for each piece.
- Exported family GLB: 6,971,992 bytes. Trading post: 8,990 triangles of the 9,000 limit.

## Checks

- Blender recipe export and exported-model review render: passed. All trading-post bounds fit the 3×3 footprint and every piece passed the ground/contact audit.
- `node --test --test-name-pattern="TOWN-ART-SERVICES GLB exports the complete named family" tools/test-blender-output.mjs`: passed, 377 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory; no oversized look sheets.
- `node --test tools/test-review-evidence.mjs`: 7 of 9 subtests passed. Rerun on the same source produced the same two unrelated failures: missing `docs/board/looks/town-art-outposts/round-15-review.md` for an existing round-15 sheet, and `spawnSync ffmpeg EPERM` in audio analysis. The review JPG publication check passed.
- Browser and in-game look review: not run here; Claude should review the road and mayor views listed in the round-9 look note.
- Changed assertions: none. Race fingerprints: not applicable; this art-only change does not touch race logic.

## Removed

- Deleted the superseded round-8 comparison sheet and review note.
- Replaced the ground-level lettering with raised lettering on the road-facing sign.
