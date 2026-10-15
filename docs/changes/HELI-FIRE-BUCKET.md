# HELI-FIRE-BUCKET

Claude, 14 October 2026 (main design session).

- `tools/blender/fire-bucket.py` and `public/assets/heli/fire-bucket.glb`:
  an original collapsible firefighting bucket built from primitives, to the
  contract in `docs/HELI_FIRE.md` section 14: about 1.1 m across, body 1.3 m,
  rigging 2.5 m, four lines to a steel top ring (the origin), nodes `bucket`,
  `rigging`, `valve` (pivot at the floor), `water` (surface at the rim) and
  `bucket_dented` (crumpled body; the game hides it until damaged, since glTF
  has no hidden flag). 2,842 triangles, PBR colours, no textures.
- Three rounds before the packet landed (valve pivot, barrel-like bands,
  buried straps), then reshaped to the packet's contract. Sheet and verdict:
  `docs/board/looks/fire-bucket/`.

Changed assertion: `tools/test-blender-output.mjs` lists this recipe and
`burnt-forest.py` in its generator table (every Blender script must be listed
and print its output paths without Blender). No existing check changed.

Tests: lane tier and build. No game code.

Removed: nothing.
