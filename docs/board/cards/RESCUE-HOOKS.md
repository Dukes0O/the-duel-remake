# RESCUE-HOOKS

Wire the rescues into the session and the board: fitting the line, the radio box, handovers.

Owner: Claude. Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet sections 3.4, 7 and 11. Files: `src/heli/heli-session.js`,
`src/heli/heli-board.js`, `tools/test-heli-rescue-session.mjs`. No
`busy-game-files`: H2's FIRE-HOOKS already wired the engine into the app.
