# FIRE-VIEW

Draw H2: fire and smoke, the bucket and falling water, the aim ring, the fire line on the instruments, the burnt course and its regrowth.

Owner: Claude (UI). Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet sections 6.1, 8.4, 9 and 14. Files: `src/heli/heli-fire-view.js`,
`src/heli/heli-scene.js`, `src/heli/heli-ui.js`, `src/heli/heli-ui.css`,
`src/burnt-look.js`. Drawing only. Until the art passes, plain stand-ins in
dev builds only. Frame check (rule 8) at 150 m over a 60-cell fire and in a
race on the burnt course.
