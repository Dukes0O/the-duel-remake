# HELI-MODE

The helicopter mode: switch, menu entry, helipad at Tremblant Woods, three destinations, cruise legs, flying areas, landing zones.

Owner: Claude (UI and SIM glue). Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Sections 2, 6 and 9 of the packet. Files: `src/heli/heli-session.js`,
`heli-jobs.js` (board data only), hooks in `src/app.js` and
`src/render3d.js` (holds `busy-game-files`), `src/feature-flags.js`
(`helicopter: 'dev'`, count change explained), `src/input-contexts.js`,
`src/screen-router.js`, `src/screen-menu.js`, `tools/test-heli-mode.mjs`
and the import guard. Race replays and world signatures stay identical.
