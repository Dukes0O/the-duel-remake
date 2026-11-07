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

## Paint shop — round 9 (7 November 2026)

### Changed

- Added four separate OpenAI ImageGen references of the same paint-shop body: side, front, rear and straight-down roof plan. Saved as 1024 px JPGs in `public/assets/models/wasteland/town/textures/` with `paint-shop-CREDITS.md`.
- Carved `paint-shop:body` from those views, leaving a measured spray-booth opening with a dark recessed interior. Added door guides, raised slats and four separate colored paint drums outside.
- Printed every paint-shop mesh bound and checked each piece against the 2×2 plot margin and ground/contact rule. All passed.
- Exported `services.glb`: 7,728,892 bytes. Paint shop: 4,786 triangles of the 5,000 limit.
- The photo/model sheet is `docs/board/looks/town-art-services/paint-shop/round-9.jpg` (289,495 bytes). The existing root `round-9.jpg` is the accepted trading-post sheet, so it remains intact.

### Checks

- Blender 4.5.13 family export and imported-GLB review renders: passed. The final paint-shop bounds/contact audit passed.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failed.
- Lane tier and build: not run, as directed for this art card. Browser checks: Claude's review.
- Changed assertions: none. Race fingerprints: not applicable; race code is unchanged.

### Claude review request

Please compare all four orthographic photo/model pairs, especially the open booth against the closed-door reference and the small dark/colored patch on the left side of the roof plan. Check whether the roof and paint marks read as intentional repairs from both three-quarter views and the mayor view. Confirm the four drums read as separate paint drums and the full model stays legible at town zoom.

### Removed

- Removed the superseded procedural wall-drip, booth-interior and extraction-duct branch for paint shop; the carved body, dark opening and separate drums now supply those features.
- No accepted building model or earlier review sheet was changed.
