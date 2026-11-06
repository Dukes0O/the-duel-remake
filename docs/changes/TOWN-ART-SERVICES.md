# TOWN-ART-SERVICES ? Round 2

## Design settled before export

Use the generated photos only as measured face and roof textures. Keep the Town Hall roof, porch, clock, vents, and signs as 3D parts. Keep each service building under its named root, with its lamp as a separate child. Join fixed parts by building before export, then fit every building inside its listed plot. This preserves placement and lamp hooks while keeping the GLB under 3 MB.

## Changed

- Rebuilt the Town Hall front from a traced reference view. Kept its pitched roof, porch, steps, clerestory, chimney, vents, clock, flags, and notice board as 3D geometry.
- Added a tyre ring and steel spokes to the car-wheel clock.
- Added photo-traced fronts for the Forge, Scrapyard, and Workshop, plus roof views for the Scrapyard and Workshop.
- Joined fixed geometry by building and fitted every building within its listed footprint, with a 0.6 m edge margin. Preserved separate forge and radio mast lamp nodes.
- Re-rendered the exported GLB at driver and mayor views for the Town Hall, Forge, Scrapyard, and Workshop. The round 2 sheet compares those views with the reference photos.

## Checks

- Blender export and GLB reimport: passed. GLB is 2,694,256 bytes and contains 37,303 triangles.
- Per-building footprint audit after GLB import: all models fit within their listed plots with at least 0.6 m of margin.
- `node tools/test-blender-output.mjs`: pending.
- `node tools/test-repo-hygiene.mjs`: pending.
- `node --test tools/test-review-evidence.mjs`: pending.
- Browser and in-game look: not run; this is an art-only lane. Claude's art verdict is pending.
- Changed assertions: none.
- Race fingerprints: not applicable; this model is not wired into the race.

## Review handoff

The builder review scores and remaining differences are in `docs/board/looks/town-art-services/round-2-review.md`. This is a round 2 submission, not an art pass. It still needs Claude's verdict before the card can close.

## Removed

- Removed the superseded round 1 review note after carrying its findings into the round 2 review.
- Removed the unused full-resolution Town Hall reference PNG from `public/`; its compressed source views remain for the recipe.
- Replaced the old round 1 brick gable and grey roof planes with the photo-traced front and measured, repaired roof geometry.
