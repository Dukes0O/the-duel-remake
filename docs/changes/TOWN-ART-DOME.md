# TOWN-ART-DOME

## Design and changes

Round 2 replaces the repeated rust slab look with photo-based materials and visible wreck forms. The recipe packs the new crops into one 1K atlas: three rows of colored crushed cars, bus fronts and sides, the painted sign, ticket booth, corrugated tin and tire-marked dirt. The outer wall has three rows of photo-backed car wrecks, sheet-metal support, a full walkway rail, crossed scaffolding, banners and four lattice floodlight towers. The Heap is a shaped 18 m mound with wrecks on its slope. The gate uses two upright bus bodies around a clear drive-through, a painted SCRAPDOME plate, the TICKETS booth and a dirt skirt.

The final GLB is `public/assets/models/wasteland/town/dome.glb`. It is not wired into the game in this card. The 1K atlas and seven compressed JPG source crops are under `public/assets/models/wasteland/town/textures/`, with prompts and credits beside them; the seven JPGs total 361,406 bytes. The mayor, road and 40 m side views are in `docs/board/looks/town-art-dome/round-2.jpg` (under 500 KB) with the review note.

## Checks

- `node tools/test-blender-output.mjs`: passed, 239 checks; 0 failed. GLB read-back: 29,722 triangles, 2,828,484 bytes, one 1K atlas.
- `node tools/test-repo-hygiene.mjs`: passed; repository placement passed. Existing advisory size reports are unchanged.
- `node --test tools/test-review-evidence.mjs`: 8/9 subtests passed. Audio analysis failed at `spawnSync ffmpeg EPERM`, the known environment failure. The JPG size and review-note checks passed.
- Browser and game look checks: not run here; Claude should review the comparison sheet as listed in the round review.
- Changed assertions: none.
- Race fingerprints: not applicable; no race or game code changed.

## Removed

Removed the old repeated-material setup, the seven-tier exterior ring of repeated wrecks, the tilted bus arch recipe and its unused bus helper. Removed render-only road geometry before GLB export. No prior accepted town model was replaced.
