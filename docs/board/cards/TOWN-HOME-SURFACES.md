# TOWN-HOME-SURFACES

Kyle approved applying the moving road study's art findings to the game on 18 November 2026. At street level, corrugated metal and painted panels should retain their existing photographed finish around the sides of Founding's homes. The study found a red-oxide surface whose picture collapsed to a line. The town scene loads all ten homes from `public/assets/models/wasteland/town/homes.glb`.

Read `docs/ART_LINE.md`, the Founding views in `docs/WASTELAND_TOWN.md`, and the round-six home review in `docs/board/looks/town-art-homes/`. Own the home recipe in `tools/blender/town-homes.py`, its exported GLB, its focused surface check, a matched comparison sheet and its change note. The existing painted fronts, home shapes, footprints, lamp nodes and game data are part of the accepted art. Keep the original picture sources and their existing credits. The town renderer, other building families and Tin Town's shacks belong to their own cards.

1. Measure textured vertical wall area and the area that maps to a line or a point on the material's actual image coordinates. Correct the verified surfaces in the model recipe, at its established physical tile scale, and repeat the export from clean inputs.
2. Check the ten named homes, lamps, materials, painted fronts, extents and triangle counts against the shipped asset. Record image count, bytes and area before and after. Keep the comparison reproducible.
3. Render the same home and street arrangement with matched lighting at driver height and with the mayor's town camera. Give laptop Claude the sheet, the cloud's lane and build results, and the existing `town-homes` browser scenario for an independent in-game look.
