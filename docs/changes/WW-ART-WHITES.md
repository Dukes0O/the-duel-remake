# WW-ART-WHITES

## Design

Round 2 follows the card's five ordered corrections. The station keeps its clock and canopy. Its deck is a one-metre timber structure about four metres wide; the station is about 20 m long. The canopy posts stand on the deck. The pan uses 12 m salt tiles with alternating quarter turns and 40 cm crust walls. The heap is a 14 m round, 5 m high salt heightfield with a feathered base.

## Changed

- Rebuilt the station deck as a full timber wall and added three steps.
- Shortened the station from about 30 m to about 20 m. Raised the canopy posts, bench and clock support to meet the deck.
- Scaled the cracked-salt repeat from 2 m to 12 m and rotated alternate tiles. Set the pan wall thickness and height to 40 cm and darkened its photo material.
- Replaced the photo-faced heap cutout with a lumpy radial heightfield. Its cracked-salt UVs repeat at the existing 2 m scale.
- Rebuilt all look views from the exported GLB in a fresh Blender scene with Standard view transform. Added the side, end, two station quarter views, pan and heap to the round-2 sheet.
- Kept the clock and canopy from round 1.

## Checks

- `blender -b --python tools/blender/rail-whites.py -- --root . --through works-platform` - passed for the station changes; exported-GLB side, end and quarter renders inspected.
- `blender -b --python tools/blender/rail-whites.py -- --root . --through salt-pan` - passed; exported-GLB pan side, quarter and top renders inspected.
- `blender -b --python tools/blender/rail-whites.py -- --root . --through salt-heap` - passed; exported-GLB station, pan and heap renders inspected.
- `node tools/test-blender-output.mjs` - passed, 296 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs` - passed; repository placement clean. Size targets remain advisory.
- Browser and in-game look checks were not run here. Claude should inspect the full round-2 sheet, especially whether the end view and 40 cm pan walls read clearly from car height.
- Changed assertions: none. Race fingerprints: not applicable; no race code or rules changed.

## Removed

- Removed the obsolete `whites-salt-heap.jpg` cutout reference and its credit entry. The generated heap now uses the cracked-salt picture.
- Replaced the round-1 comparison sheet and review note with round 2.
- Deleted temporary renders, logs and sheet-generation scratch from `.qa-dist` before handoff.
