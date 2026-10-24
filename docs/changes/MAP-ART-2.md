# MAP-ART-2: the Table's mesa and the bush plane wreck

Card: MAP-ART-2 (Claude; follow-up to MAP-ART). Same recipe, `tools/blender/pilot-map-props.py`;
only `table-mesa.glb` and `table-plane-wreck.glb` change. Switch `pilot-map` (dev); nothing loads
them yet (MAP-VIEW does).

## What changed

- **Mesa:** now a real rock surface. The game's own weathered sandstone picture
  (`public/assets/textures/red-sandstone.png`, original generated art) is scaled to 1024 and
  embedded as a JPEG, on proper UVs (wrapped round the butte at 56 repeats, planar on top, triplanar
  on rocks) and multiplied by a per-vertex tint, giving strata of unequal thickness. Geometry: vertical
  joints that run down through the layers, chutes with dark varnish streaks, a sheared and rounded
  rim, a less round outline, a lumpy rubble apron 55 m high (so `ground_level` is now y = -165), 110
  fallen blocks and 110 scree rocks, and three detached spires. 36,000 triangles, 2.7 MB.
- **Plane wreck:** one 2048 picture baked in Blender (Cycles) from a procedural wear network: dust
  gathering in crevices, panel seams (a brick pattern) and low surfaces, rust in the crevices, bare
  metal on edges; the tail area is kept clean. Faded cream paint with one orange stripe; a crushed
  nose; the left gear leg sheared and folded with its wheel lying beside it; the airframe rolled and
  nose-down; the right wing outer half on the ground. `N4471K` is on both sides of the fin and the
  rear fuselage, flat dark paint (glass and the number stay unbaked). 3,800 triangles, 0.23 MB.
- `tools/art/pilot-map-sheet.py` now builds the mesa and plane sheet; the three MAP-ART sheets and notes
  were removed (superseded); two new rounds are in `docs/board/looks/pilot-map/`.
- Credits row extended. The pilot-map folder is 4.7 MB in all (budget about 5 MB).

## Open for Claude

- Limits: the apron's texture still wraps radially at its far edge; the spires are smooth; the baked
  plane picture is soft very close up.
- For MAP-VIEW: the mesa can keep its embedded picture, or swap its material for the game's shared
  stone material (`createDesertStoneMaterial`, world-projected) to reuse the texture already in memory.

## Changed assertions

None.

## Removed

The superseded MAP-ART look sheets and notes (`round-1`, `round-2`, `round-3` and their reviews), and
the mesa's and plane's old flat-colour band materials and random per-face wear.

## Gates

24 October 2026, once, after merging current `integration/wasteland` (clean): `node tools/test-blender-output.mjs`
(77 checks), `node tools/test-review-evidence.mjs` (9 passed), `node tools/test-repo-hygiene.mjs` passed,
`node tools/run-tests.mjs --tier lane --changed --jobs 4`: 34 passed, 0 failed (356 s), `npm run build`: pass.
No browser or frame check: nothing loads these models yet (rule 9).
