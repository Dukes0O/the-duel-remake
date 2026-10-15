# WILD-VIEW

Draw the animals in races and from the air: idle, run into cover, birds taking off.

Owner: Claude (UI). Design: `docs/HELI_WILDLIFE.md` (the H3 Wildlife and skins packet). The
board entry holds state, needs and locks.

Packet sections 3.3 and 3.4. Files: `src/wildlife-view.js` (new), one call
in `src/render3d.js` (holds `busy-game-files` briefly). Race replays and
world signatures unchanged; animals in their own group. Can start on the
North woods once WILD-ART-SRC passes them.
