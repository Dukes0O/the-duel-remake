# RESCUE-LINE

The rescue line: the rescuer on the cable, set-down and hold, bumps, handover, the supply crates.

Owner: Claude (SIM). Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet sections 4 and 5.4. Files: `src/heli/heli-rescue.js` (new),
`tools/test-heli-rescue.mjs`. Uses H1's cable unchanged; waits for
FIRE-BUCKET, which may change how the cable reads a load's mass.
