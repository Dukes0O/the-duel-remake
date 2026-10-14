# HELI-KESTREL (part of HELI-ART-SRC)

Claude, 14 October 2026. Kyle asked Claude to build what it can without
waiting; Codex's donor route was blocked (preferred CC0 source down, the
CC BY R22 needs an account only Kyle can make).

- `tools/blender/kestrel-one.py`: an original Kestrel One built from
  primitives, to the exact model contract on HELI-ART-SRC. Rebuild:
  `blender -b --factory-startup --python tools/blender/kestrel-one.py -- --root . [--render .evidence/<date>/HELI-ART-SRC/rN]`.
- `public/assets/heli/kestrel-one.glb` (539 KB, 12,580 triangles). Not yet
  loaded by the game: `src/heli/heli-scene.js` still draws the stand-in
  until the H1 finishing pass wires the model (handed to that session).
- Round sheet and review: `docs/board/looks/kestrel-one/` (three rounds, closed).

Tests: lane tier and build. No game code, no assertions changed.

Removed: nothing yet. The stand-in in `heli-scene.js` is removed by the card
that wires this model.

Changed assertion: `tools/test-blender-output.mjs` lists the new recipe in
its generator table (the suite requires every Blender script to be listed and
to print its output paths without Blender). The recipe gained `--paths-only`
and writes its runtime model to `public/assets/heli/kestrel-one.glb` and its
editable file to ignored `art-build/heli/`. No existing check changed.
