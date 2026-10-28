# RESCUE-ENGINE

The rescue kinds in the mission engine: seasons, waiting calls, clocks; the car recovery job.

Owner: Claude (SIM). Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet sections 3 and 5.3. Files: `src/heli/heli-missions.js`,
`src/heli/heli-jobs.js` (with Summit Run as a destination, section 5.5),
`tools/test-heli-missions.mjs`,
`tools/test-heli-jobs.mjs`. Adds the rescue rows to FIRE-SEASONS' weights
table, and the failure cost (packet section 4.2): 400 credits by the repair
rule, the skin tally down one, a supply run's 200.

## Note from RESCUE-SAVE's save review (Claude, 16 October)

`normalizeCall` accepts the rescue kinds (hiker, avalanche, hoist, supply).
While the `rescue` switch is off, the engine must treat a stored call of a
rescue kind as absent (never offered, never blocking a new fire call), so a
save made in a rescue-on build never jams fires when the switch is off.
Add a test for it here.
