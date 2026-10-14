# HELI-DISPATCH

The dispatch board, flying your own car, Race here, and special cars that travel only by air.

Owner: Claude. Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Sections 5 and 6 of the packet. Files: `src/heli/heli-jobs.js`, the board in
`heli-ui.js`, the Race here hook in `src/app.js` (holds `busy-game-files`
after HELI-MODE), `tools/test-heli-jobs.mjs`. Touches the special-car rule
in the save, so the save checker runs.
