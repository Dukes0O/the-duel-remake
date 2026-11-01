# WATER-YARD-ART: round 3 of 3 (final, picked)

Claude picked round 2 and asked for a small polish only. This is the last round.

Sheet: `round-3.jpg`, nine chapters, same layout and camera as round 2, rendered from the scene that is
exported to `public/assets/models/wasteland/scrapdome/water-works.glb`. Rebuild:
`blender -b --python tools/blender/water-works.py -- --root . --render .qa-dist/water-works`, then
`python docs/board/looks/water-works/round-3-sheet.py --captures .qa-dist/water-works --output docs/board/looks/water-works/round-3.jpg`.

## What changed from round 2

1. `pipe-patched` collar: dark steel grey with bright silver weld beads, darker clamps with silver
   bolt heads, and a dark steel plate on the prop. It reads as metal, not as a white spool.
2. Smoke: the plank-like wisp is gone. A chain of round puffs was tried and read as beads from the
   sheet camera, so there is no smoke; the stained dark cap and soot band on the stack stay.
3. Coals in the lit firebox are round, flattened mounds in orange and yellow.
4. Valve wheel is a true deep red, not salmon.

Nothing else changed. Nodes, layout and placement are the same as round 2 (root `water-works`,
25 children; suggested yard position (-4, 0, 31), no turn). GLB 1,957,092 bytes (round 2 was
1,979,172), 23,000 triangles or fewer for all nodes together.

## Open

Round 3 of 3 is the last. What stays weak is listed in the change note.
