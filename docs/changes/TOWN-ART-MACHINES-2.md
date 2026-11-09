# TOWN-ART-MACHINES-2 ? round 20

## Changed

- Replaced the roller's old block geometry with a photo-carved body and separately built station, tires, yoke and turning drum. The mixer, crane and pipe truck recipes were left unchanged.
- Added and credited four roller view photos and the drum photo. Removed `machines2-roller-views.jpg` and its credit.
- Added the roller comparison sheet and visual review note.

## Checks

- `python -m py_compile tools/blender/town-machines-2.py`: passed.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** on the final recipe.
- Blender rendered the imported family GLB to side, front, rear, overhead, rest and work evidence.
- No lane tier or build was run. No browser scenario was run; Claude owns the look review.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Claude should look at

See `docs/board/looks/town-art-machines-2/round-20-review.md`. The sheet records major assembly and framing faults; this round is submitted for judgment, not marked as passing.

## Removed

- Removed the old four-view roller reference and its CREDITS entry after the new references replaced it.
