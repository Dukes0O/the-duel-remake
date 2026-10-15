# FIRE-HOOKS

Wire H2 into the game: the session, the board's radio and bucket buttons, play days on profile activation, the race start check, the burnt look in races.

Owner: Claude. Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet sections 8.1, 8.3, 9 and 13. Holds `busy-game-files` once, briefly:
`src/app.js` (play day when a profile becomes active, `courseClosed` on the
race start path, the session's new events) and `src/render3d.js` (one call
into `src/burnt-look.js`). Also `src/heli/heli-session.js`,
`src/heli/heli-board.js`, `src/input-contexts.js` (R and Y), and
`tools/test-heli-fire-session.mjs`. Switch off: race replays, world
signatures and the menu stay exactly as they are.
