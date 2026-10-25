# MAP-ART-2

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October, after MAP-ART's three rounds. Accepted from MAP-ART: the
five signs, the fire lookout, the dirt strip, the windsock and the logbook.
Not final: the mesa and the bush plane wreck. Nothing loads either yet, so the
pilot's map waits on this card, not on MAP-ART.

- **The Table (mesa):** today it reads as a smooth layered cake. Give it a real
  rock surface by reusing the game's "Weathered layered sandstone" texture
  (`src/desert-detail.js`) with proper UVs, uneven strata, a broken, rockier
  cliff edge with fallen blocks at its foot, and varied scree. It should read
  like a Monument Valley butte, not a cake.
- **The bush plane wreck:** today the wear follows big flat faces, so it looks
  like camouflage and a toy. Bake a dust and rust map that gathers in seams,
  rivet lines and the lower surfaces; faded single-colour paint with one
  stripe; a dented, tilted airframe with a collapsed gear leg. The tail
  number N4471K must read cleanly on the fin.
- Two rounds at most, one sheet each in `docs/board/looks/pilot-map/`; Claude
  judges. Same recipe, `tools/blender/pilot-map-props.py`.
