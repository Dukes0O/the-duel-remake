# HELI-FLIGHT

The flight simulation: lift, thin air, ground effect, forward-speed lift, fuel burn, touchdown classes, autorotation and the autopilot.

Owner: Claude (SIM). Design: `docs/HELICOPTER.md` (the packet, Kyle's storyboard
decisions of 14 October 2026). The board entry holds state, needs and locks.

Sections 3 and 4 of the packet. Files: `src/heli/heli-flight.js`,
`heli-autopilot.js`, `heli-ground.js`, `tools/test-heli-flight.mjs`.
Pure, fixed step 1/120 s, no graphics, same inputs give the same flight.
No locks.
