# RESCUE-VIEW

Draw H4: people on the line, the flare, the slide, the beacon bar, the clock, dusk.

Owner: Claude (UI). Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet sections 5, 7 and 13. Files: `src/heli/heli-rescue-view.js` (new),
`src/heli/heli-scene.js`, `src/heli/heli-ui.js`, `src/heli/heli-ui.css`.
Drawing only, plus Summit Run's from-the-air check (section 5.5). Frame
check (rule 8) hovering over the avalanche.


From RESCUE-HOOKS' review (Claude, 16 October): pressing Later on a waiting rescue call repeats Roger's line each time (`heli-fire-run.js` declineCall). Say it once per call.
