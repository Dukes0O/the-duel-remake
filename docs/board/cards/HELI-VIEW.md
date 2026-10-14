# HELI-VIEW

Drawing the helicopter, four camera views, the instruments, and the look of each destination from 150 m.

Owner: Claude (VIS). Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Section 8 of the packet. Files: `src/heli/heli-scene.js`,
`heli-camera.js`, `heli-ui.js`, `heli-ui.css`. Uses HELI-ART-SRC's models;
a plain stand-in is allowed in dev builds until they pass, never at release.
Frame check (rule 8) at 150 m over Panorama Ridge once reachable.
