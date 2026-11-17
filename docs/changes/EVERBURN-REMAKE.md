# EVERBURN-REMAKE slice 6b

The camp rider sleeps until its fence burns or a Hard scoop wakes it. Once awake, it waits past the standing fence and charges within its road limits.
The scout sounds `world.ashmen.horn`, runs to camp, and wakes its rider; flame or a ram stops it as a wreck.
The ram uses the cars' closing speed for the existing `world.ember.spark` hit; 15 km/h costs 2.1 fire on Medium.
On e2f2659c8 plus the ram change, `node tools/test-everburn-job1.mjs` passed; the bed arrived with 35.86 fire and no rams.
Earlier checks: the same suite passed for the camp, scout post, warning, run and flame; `test-p4-audio.mjs` passed outside the sandbox.
Changed assertion, for Claude: camp scoop wake uses Hard instead of Medium and checks persistent waking, as the three wakings require. Rider setups specify a burnt fence for immediate charges; their assertions are unchanged.
After scout home: job suite scout rule passed; the bed driver alerts the scout, takes two rams and arrives with 9.51 fire after a scoop; without a scoop it runs out and the suite fails. Claude must rule on proof drives.
Scout warning, stopped and home lines are captions only; the chase line and rider mark appear while applicable.
On 7a4c2fcb5 plus these changes, the new line, map and scout checks passed; the job suite then failed on the known bed without a scoop (0 fire, 2 rams).
For Claude: recorded Rook lines, browser pictures and hand chase remain; the browser cannot run in this lane.
Cinder and forge rings sit above the ground from 40 m; the ring checks passed on fc5c25194 plus this change.
The picture scenario now loads the pot before the rider views and includes both scout distances and the awake camp; 49 page expressions parsed in Node. Final checks remain.
Removed: automatic camp pursuit while asleep and charging through a standing fence.
