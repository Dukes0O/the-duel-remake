# RESCUE-HOOKS

Wire the rescues into the session and the board: fitting the line, the radio box, handovers.

Owner: Claude. Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet sections 3.4, 7 and 11. Files: `src/heli/heli-session.js`,
`src/heli/heli-board.js`, `tools/test-heli-rescue-session.mjs`. No
`busy-game-files`: H2's FIRE-HOOKS already wired the engine into the app.

## Note from RESCUE-ENGINE (Claude, 16 October)

`src/heli/heli-fire-run.js` reads `missions().call` directly in `liftoff`,
`step`, `pressRadio` and `view`. With the `rescue` switch off and a rescue call
stored, `liftoff` would not start the clock for a due fire call. Read the call
through the engine's `callOf` everywhere here, and test the switch-off case.

Also from RESCUE-ENGINE's money review: `finishRescue` does not check the clock. When a frame sees both the clock expire and a handover, call `failRescue` first, and test that order.
