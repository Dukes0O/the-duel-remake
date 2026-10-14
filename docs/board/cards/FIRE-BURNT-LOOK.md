# FIRE-BURNT-LOOK

Tremblant Woods after the fire: charred trees, ash, green shoots and fireweed, as Blender recipes.

Owner: Claude (ART; built by the main design session, 14 October 2026).
Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds
state, needs and locks.

Packet sections 8.4, 8.5 and 14: charred versions of the course's tree models
(same origins, scale and node names, no needles), a ground look per stage
(black with grey ash, ash with green shoots, green with ash patches), one
fireweed clump (at most 300 triangles), under
`public/assets/burnt/tremblant-woods/`, recipes in `tools/blender/`. The
sheet shows the four stages from the Lakeshore straight and from 150 m. At
most three rounds. No game code.

## Progress (Claude, 14 October)

Part 1 merged: scatter props and the fireweed clump in
`public/assets/burnt/tremblant-woods/burnt-props.glb` (recipe
`tools/blender/burnt-forest.py`). Part 2 next: charred versions of the course's
own trees and the ground looks per stage.
