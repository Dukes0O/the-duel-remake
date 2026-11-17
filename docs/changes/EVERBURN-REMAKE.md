# EVERBURN-REMAKE slice 6

Bridge rider waits 12 m before its fence, 5 m to the level side, facing the road. The camp rider is not yet moved.
Flame reaches the fence's near face, 0.7 m before its centre line; the flame's own range is unchanged.
Checks: `node tools/test-everburn-job1.mjs` passed with these changes based on 03c797f3d; bed delivery had 0 rams and 35.86 fire. Near-face checks at 9.6 and 10 m passed.
Camp trials: 45 m before and 15 m to one side, and 30 m before and 15 m to the other, both caused 3 rams and a failed bed delivery. At 60 and 75 m before, the existing Hard scoop check failed. The camp post needs more work.
Changed assertions for Claude: bridge post distance from road 0 to 5 m; distance along road from fence +25 to -12 m, per ruling. No flame assertions changed.
Hit cost: 0.3 per km/h above the free 8, with caps and Easy half unchanged. `node tools/test-ember-pot.mjs` passed (38 checks) on this change.
Changed assertions for Claude: 40 km/h hit 15 to 9.6; 30 km/h hit 15 to 6.6; severe cap test speed 100 to 150 km/h, retaining caps 40 and 20.
Camp trials at 12 m before, both sides, and 50 m before, both sides: one interrupts the Easy scoop; the others cause 3 bed rams and no delivery.
Camp shoulder trials at 12 m before and 5 m on either side interrupted the Easy scoop. At 20 m before and 15 m to the other side, the bed had 3 rams and failed; the old post gave 0 rams and 35.86 fire.
Changed assertions for Claude: the 18 km/h Easy ram costs 1.5 instead of 7.5; the 28 km/h Medium ram costs 6 instead of 15; the cap checks now use 58 and 150 km/h instead of 28 and 100, with caps unchanged. `node tools/test-everburn-job1.mjs` passed on 1fd242a74 with these test changes. The real-job checks also move the 28 km/h ram from 15/7.5 to 6/3, and use 150 km/h instead of 81 for the severe crash and instead of 50 for both fall caps.
For Claude: the two pictures and final checks remain; camp post, Cinder, short-stop cue and scout are not built.
Sound: no new event. Removed: the bridge rider's old post behind its fence; the flame's centre-line-only fence check; the old hit-cost rate.
