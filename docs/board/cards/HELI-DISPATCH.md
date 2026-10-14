# HELI-DISPATCH

The dispatch board, flying your own car, Race here, and special cars that travel only by air.

Owner: Claude. Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Sections 5 and 6 of the packet. Files: `src/heli/heli-jobs.js`, the board in
`heli-ui.js`, `tools/test-heli-jobs.mjs`. No lock: it uses the Race here
hook that HELI-HOOKS puts in `src/app.js` (re-sliced 14 October 2026). Touches the special-car rule
in the save, so the save checker runs.
