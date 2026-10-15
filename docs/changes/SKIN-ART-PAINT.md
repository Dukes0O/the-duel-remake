# SKIN-ART-PAINT

Claude, 14 October 2026. `tools/art/kestrel-skins.py` writes Kestrel One's paint
table and textures to `public/assets/heli/skins/`: `palettes.json` (seven paints
as colours for paint_white, paint_navy and paint_red, grime colours, the TV
skin's door decals), `camo.jpg`, and four tiling grime masks (dust, mud, soot,
salt). One round; sheet and verdict in `docs/board/looks/heli-paints/`. Not
loaded until SKIN-VIEW.

Tests: lane tier and build. No game code, no assertions changed.

Removed: nothing.
