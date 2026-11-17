# EVERBURN-REMAKE slice 6b

The camp rider sleeps until its fence burns or a Hard scoop wakes it. Once awake, it waits past the standing fence and charges within its road limits.
The scout is a rider at the East Road post. It sounds `world.ashmen.horn`, runs, and stops as a wreck when touched by flame or rammed.
The ram uses the cars' closing speed for the existing `world.ember.spark` hit; 15 km/h costs 2.1 fire on Medium.
Checks on e2f2659c8 plus the ram change: `node tools/test-everburn-job1.mjs` passed. The bed arrived with 35.86 fire and no rams.
Earlier checks: the same suite passed for the camp, scout post, warning, run and flame; `test-p4-audio.mjs` passed outside the sandbox.
Changed assertion, for Claude: camp scoop wake uses Hard instead of Medium and checks persistent waking, as the three wakings require. Rider setups specify a burnt fence for immediate charges; their assertions are unchanged.
For Claude: browser pictures and hand chase remain; the browser cannot run in this lane.
Remaining: scout reaching camp and waking it, player lines, small map, rings, and final checks.
Removed: automatic camp pursuit while asleep and charging through a standing fence.
