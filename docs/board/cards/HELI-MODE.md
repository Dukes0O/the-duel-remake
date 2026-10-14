# HELI-MODE

The helicopter mode: switch, menu entry, helipad at Tremblant Woods, three destinations, cruise legs, flying areas, landing zones.

Owner: Claude (UI and SIM glue). Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Sections 2, 6 and 9 of the packet. Files: `src/heli/heli-session.js`,
`heli-jobs.js` (board data only), `src/feature-flags.js`
(`helicopter: 'dev'`, count change explained), `src/input-contexts.js`,
`tools/test-heli-mode.mjs` and the import guard. No locks: the hooks in
`src/app.js`, `src/render3d.js` and the menu move to HELI-HOOKS (re-sliced
14 October 2026). The session is driven headless here; HELI-HOOKS plugs it
into the game. Race replays and world signatures stay identical.
